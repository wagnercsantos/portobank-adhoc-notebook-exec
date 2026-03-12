"""Database connection pool for Lakebase."""

import os
import asyncpg
from typing import Optional, Tuple
from .config import get_lakebase_credential, get_workspace_client, IS_DATABRICKS_APP


def is_lakebase_host(host: str) -> bool:
    """Check if host is a Lakebase endpoint (AWS or Azure)."""
    lakebase_patterns = [
        "database.cloud.databricks.com",  # AWS
        ".database.brazilsouth.azuredatabricks.net",  # Azure Brazil South
        ".database.westus.azuredatabricks.net",  # Azure West US
        ".database.eastus.azuredatabricks.net",  # Azure East US
        ".database.westeurope.azuredatabricks.net",  # Azure West Europe
        ".azuredatabricks.net",  # Generic Azure (catch-all for database endpoints)
    ]
    for pattern in lakebase_patterns:
        if pattern in host:
            return True
    return False


def get_lakebase_connection_info() -> Optional[Tuple[str, int, str, str]]:
    """Get Lakebase connection info from SDK or environment.

    Returns (host, port, database, user) or None if not configured.
    """
    # First, try to get from properly configured env vars
    pghost = os.environ.get("PGHOST", "")
    pgport = os.environ.get("PGPORT", "")
    pgdatabase = os.environ.get("PGDATABASE", "")
    pguser = os.environ.get("PGUSER", "")

    # Check if we have a Lakebase host configured
    if pghost and is_lakebase_host(pghost):
        host = pghost
        port = int(pgport) if pgport else 5432
        database = pgdatabase if pgdatabase else "postgres"

        # Get user from env, SDK, or default to service principal
        if pguser:
            user = pguser
        else:
            try:
                w = get_workspace_client()
                user = w.current_user.me().user_name
            except Exception as e:
                print(f"Could not get current user from SDK: {e}")
                # For service principals, use application_id or default
                user = os.environ.get("DATABRICKS_CLIENT_ID", "app")

        print(f"Lakebase connection configured: host={host}, port={port}, database={database}, user={user}")
        return (host, port, database, user)

    # Check if PGPORT looks like a valid port (numeric) and all vars are set
    try:
        if pgport and pghost and pgdatabase and pguser:
            port = int(pgport)
            if 1 <= port <= 65535:
                return (pghost, port, pgdatabase, pguser)
    except ValueError:
        pass

    # Legacy check for AWS Lakebase hostname pattern
    if pghost and "database.cloud.databricks.com" in pghost:
        host = pghost
        port = 5432  # Lakebase default port

        # Try to get database name from workspace client
        try:
            w = get_workspace_client()
            # Get current user email for the database user
            user = w.current_user.me().user_name

            # List Lakebase databases to find the one associated with this app
            try:
                databases = list(w.lakebase_databases.list())
                if databases:
                    # Use the first database found (or find by matching host)
                    for db_info in databases:
                        # Check if this database's host matches
                        if hasattr(db_info, 'host') and db_info.host == host:
                            database = db_info.name if hasattr(db_info, 'name') else "postgres"
                            return (host, port, database, user)
                    # If no match, use the first database
                    db_info = databases[0]
                    database = db_info.name if hasattr(db_info, 'name') else "postgres"
                    return (host, port, database, user)
            except Exception as e:
                print(f"Could not list Lakebase databases: {e}")
                # Fallback: use "postgres" as default database
                return (host, port, "postgres", user)
        except Exception as e:
            print(f"Could not get workspace client: {e}")
            # Last resort: try with defaults
            return (host, port, "postgres", os.environ.get("DATABRICKS_APP_NAME", "app"))

    # No Lakebase configuration found
    return None


class DatabasePool:
    def __init__(self):
        self._pool: Optional[asyncpg.Pool] = None
        self._demo_mode = False

    async def get_pool(self) -> Optional[asyncpg.Pool]:
        """Get or create the connection pool."""
        # Get connection info
        conn_info = get_lakebase_connection_info()
        if conn_info is None:
            print("No Lakebase configuration found")
            self._demo_mode = True
            return None

        host, port, database, user = conn_info
        print(f"Connecting to Lakebase: host={host}, port={port}, database={database}, user={user}")

        # Create or refresh pool
        if self._pool is None:
            try:
                # Check if PGPASSWORD is set (from app resource)
                pgpassword = os.environ.get("PGPASSWORD", "")
                pguser_env = os.environ.get("PGUSER", "")

                if pgpassword and pguser_env:
                    # Use credentials from app resource (Databricks Apps platform)
                    final_user = pguser_env
                    cred_password = pgpassword
                    print(f"Using credentials from PGPASSWORD env var for user: {final_user}")
                else:
                    # Get proper Lakebase credentials via API (username + token)
                    cred_user, cred_password = get_lakebase_credential()
                    # Use credential username if available, otherwise use discovered user
                    final_user = cred_user if cred_user else user
                    print(f"Using API credentials for user: {final_user}")

                self._pool = await asyncpg.create_pool(
                    host=host,
                    port=port,
                    database=database,
                    user=final_user,
                    password=cred_password,
                    ssl="require",
                    min_size=2,
                    max_size=10,
                )
                print("Lakebase connection pool created successfully")
            except Exception as e:
                print(f"Lakebase connection failed: {e}")
                self._demo_mode = True
                return None
        return self._pool

    async def refresh_token(self):
        """Refresh OAuth token (call every ~45 minutes)."""
        if self._pool:
            await self._pool.close()
            self._pool = None
        await self.get_pool()

    async def close(self):
        """Close the connection pool."""
        if self._pool:
            await self._pool.close()
            self._pool = None

    @property
    def is_demo_mode(self) -> bool:
        return self._demo_mode


db = DatabasePool()


# No schema prefix - use default schema from search_path
# Lakebase service principals have limited permissions
APP_SCHEMA = ""


def get_table_name(table: str) -> str:
    """Get fully qualified table name."""
    if APP_SCHEMA:
        return f"{APP_SCHEMA}.{table}"
    return table


async def init_schema():
    """Initialize database schema for approval workflow."""
    pool = await db.get_pool()
    if pool is None:
        print("Running in demo mode - no database available")
        return

    table_name = get_table_name("approval_requests")

    async with pool.acquire() as conn:
        # Check current schema search_path
        try:
            result = await conn.fetchval("SHOW search_path")
            print(f"Database search_path: {result}")

            # Try to get current user for debugging
            current_user = await conn.fetchval("SELECT current_user")
            print(f"Connected as user: {current_user}")
        except Exception as e:
            print(f"Could not get database info: {e}")

        # Create table in default schema (no schema prefix)
        try:
            await conn.execute(f"""
                CREATE TABLE IF NOT EXISTS {table_name} (
                    id SERIAL PRIMARY KEY,
                    request_id UUID DEFAULT gen_random_uuid() UNIQUE,
                    requester_email VARCHAR(255) NOT NULL,
                    requester_name VARCHAR(255) NOT NULL,
                    notebook_name VARCHAR(500) NOT NULL,
                    notebook_path VARCHAR(1000) NOT NULL,
                    notebook_content TEXT,
                    justification TEXT NOT NULL,
                    status VARCHAR(50) DEFAULT 'pending',
                    approver_email VARCHAR(255),
                    approver_name VARCHAR(255),
                    approval_notes TEXT,
                    job_id BIGINT,
                    job_run_id BIGINT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    approved_at TIMESTAMP,
                    executed_at TIMESTAMP
                )
            """)
            print(f"Table '{table_name}' created or already exists")

            # Create indexes separately to avoid issues
            await conn.execute(f"""
                CREATE INDEX IF NOT EXISTS idx_requests_requester
                    ON {table_name}(requester_email)
            """)
            await conn.execute(f"""
                CREATE INDEX IF NOT EXISTS idx_requests_status
                    ON {table_name}(status)
            """)
            await conn.execute(f"""
                CREATE INDEX IF NOT EXISTS idx_requests_created
                    ON {table_name}(created_at DESC)
            """)

            # Create admins table
            admins_table = get_table_name("admins")
            await conn.execute(f"""
                CREATE TABLE IF NOT EXISTS {admins_table} (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) NOT NULL UNIQUE,
                    display_name VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_by VARCHAR(255)
                )
            """)
            print(f"Table '{admins_table}' created or already exists")

            # Create approvers table
            approvers_table = get_table_name("approvers")
            await conn.execute(f"""
                CREATE TABLE IF NOT EXISTS {approvers_table} (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) NOT NULL UNIQUE,
                    display_name VARCHAR(255),
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_by VARCHAR(255)
                )
            """)
            print(f"Table '{approvers_table}' created or already exists")

            print("Database schema initialized successfully")
        except Exception as e:
            print(f"Table creation failed: {e}")
            print("App will run in demo mode without database persistence")
            db._demo_mode = True


async def is_admin(email: str) -> bool:
    """Check if user is an admin."""
    pool = await db.get_pool()
    if pool is None:
        return False

    admins_table = get_table_name("admins")
    async with pool.acquire() as conn:
        result = await conn.fetchval(
            f"SELECT EXISTS(SELECT 1 FROM {admins_table} WHERE LOWER(email) = LOWER($1))",
            email
        )
        return result


async def is_approver(email: str) -> bool:
    """Check if user is an approver."""
    pool = await db.get_pool()
    if pool is None:
        return False

    approvers_table = get_table_name("approvers")
    async with pool.acquire() as conn:
        result = await conn.fetchval(
            f"SELECT EXISTS(SELECT 1 FROM {approvers_table} WHERE LOWER(email) = LOWER($1) AND is_active = TRUE)",
            email
        )
        return result


async def get_all_admins() -> list:
    """Get all admins."""
    pool = await db.get_pool()
    if pool is None:
        return []

    admins_table = get_table_name("admins")
    async with pool.acquire() as conn:
        rows = await conn.fetch(f"SELECT * FROM {admins_table} ORDER BY created_at DESC")
        return [dict(row) for row in rows]


async def get_all_approvers() -> list:
    """Get all approvers."""
    pool = await db.get_pool()
    if pool is None:
        return []

    approvers_table = get_table_name("approvers")
    async with pool.acquire() as conn:
        rows = await conn.fetch(f"SELECT * FROM {approvers_table} ORDER BY created_at DESC")
        return [dict(row) for row in rows]


async def add_admin(email: str, display_name: str, created_by: str) -> bool:
    """Add a new admin."""
    pool = await db.get_pool()
    if pool is None:
        return False

    admins_table = get_table_name("admins")
    async with pool.acquire() as conn:
        try:
            await conn.execute(
                f"INSERT INTO {admins_table} (email, display_name, created_by) VALUES ($1, $2, $3)",
                email.lower(), display_name, created_by
            )
            return True
        except Exception as e:
            print(f"Error adding admin: {e}")
            return False


async def remove_admin(email: str) -> bool:
    """Remove an admin."""
    pool = await db.get_pool()
    if pool is None:
        return False

    admins_table = get_table_name("admins")
    async with pool.acquire() as conn:
        result = await conn.execute(
            f"DELETE FROM {admins_table} WHERE LOWER(email) = LOWER($1)",
            email
        )
        return "DELETE" in result


async def add_approver(email: str, display_name: str, created_by: str) -> bool:
    """Add a new approver."""
    pool = await db.get_pool()
    if pool is None:
        return False

    approvers_table = get_table_name("approvers")
    async with pool.acquire() as conn:
        try:
            await conn.execute(
                f"INSERT INTO {approvers_table} (email, display_name, created_by) VALUES ($1, $2, $3)",
                email.lower(), display_name, created_by
            )
            return True
        except Exception as e:
            print(f"Error adding approver: {e}")
            return False


async def remove_approver(email: str) -> bool:
    """Remove an approver (set inactive)."""
    pool = await db.get_pool()
    if pool is None:
        return False

    approvers_table = get_table_name("approvers")
    async with pool.acquire() as conn:
        result = await conn.execute(
            f"UPDATE {approvers_table} SET is_active = FALSE WHERE LOWER(email) = LOWER($1)",
            email
        )
        return "UPDATE" in result


async def delete_approver(email: str) -> bool:
    """Permanently delete an approver."""
    pool = await db.get_pool()
    if pool is None:
        return False

    approvers_table = get_table_name("approvers")
    async with pool.acquire() as conn:
        result = await conn.execute(
            f"DELETE FROM {approvers_table} WHERE LOWER(email) = LOWER($1)",
            email
        )
        return "DELETE" in result
