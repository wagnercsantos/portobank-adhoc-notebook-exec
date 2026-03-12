"""Configuration and authentication for Databricks Apps."""

import os
import requests
from databricks.sdk import WorkspaceClient

# Detect environment
IS_DATABRICKS_APP = bool(os.environ.get("DATABRICKS_APP_NAME"))

# Lakebase project configuration
LAKEBASE_PROJECT = os.environ.get("LAKEBASE_PROJECT", "portobank-prod-adhoc-exec")
LAKEBASE_BRANCH = os.environ.get("LAKEBASE_BRANCH", "production")
LAKEBASE_ENDPOINT = os.environ.get("LAKEBASE_ENDPOINT", "primary")


def get_workspace_client() -> WorkspaceClient:
    """Get authenticated WorkspaceClient."""
    if IS_DATABRICKS_APP:
        # Remote: Uses auto-injected service principal credentials
        return WorkspaceClient()
    else:
        # Local: Uses Databricks CLI profile
        profile = os.environ.get("DATABRICKS_PROFILE", "DEFAULT")
        return WorkspaceClient(profile=profile)


def get_lakebase_credential() -> tuple[str, str]:
    """Get Lakebase database credentials (username, password).

    Uses the generate-database-credential API for Autoscaling Lakebase.
    Returns (username, password) tuple.
    """
    client = get_workspace_client()

    # Get auth headers for API call
    auth_headers = client.config.authenticate()
    host = client.config.host.rstrip("/")

    # Construct the endpoint path
    endpoint_path = f"projects/{LAKEBASE_PROJECT}/branches/{LAKEBASE_BRANCH}/endpoints/{LAKEBASE_ENDPOINT}"

    # Call the generate-database-credential API (correct endpoint)
    url = f"{host}/api/2.0/postgres/credentials"
    response = requests.post(
        url,
        headers=auth_headers,
        json={"endpoint": endpoint_path}
    )

    if response.status_code == 200:
        creds = response.json()
        token = creds.get("token", "")

        # Extract username from JWT token's 'sub' claim
        import base64
        try:
            # JWT format: header.payload.signature
            payload_b64 = token.split(".")[1]
            # Add padding if needed
            payload_b64 += "=" * (4 - len(payload_b64) % 4)
            import json
            payload = json.loads(base64.urlsafe_b64decode(payload_b64))
            username = payload.get("sub", "")
            print(f"Lakebase credential generated for user: {username}")
        except Exception as e:
            print(f"Could not parse JWT token: {e}")
            username = ""

        return (username, token)
    else:
        print(f"Failed to generate Lakebase credential: {response.status_code} - {response.text}")
        # Fall back to OAuth token method
        return get_oauth_credential_fallback()


def get_oauth_credential_fallback() -> tuple[str, str]:
    """Fallback: Get OAuth token for Lakebase authentication."""
    client = get_workspace_client()

    # Get current user/service principal for username
    try:
        user = client.current_user.me()
        username = user.user_name
    except Exception:
        # For service principals, use application_id
        username = os.environ.get("DATABRICKS_CLIENT_ID", "app")

    # Get OAuth token for password
    auth_headers = client.config.authenticate()
    if auth_headers and "Authorization" in auth_headers:
        password = auth_headers["Authorization"].replace("Bearer ", "")
        return (username, password)

    raise RuntimeError("Failed to get OAuth credentials")


def get_oauth_token() -> str:
    """Get OAuth token for Lakebase authentication (legacy)."""
    _, password = get_lakebase_credential()
    return password


def get_workspace_host() -> str:
    """Get workspace host URL with https:// prefix.

    Priority:
    1. DATABRICKS_HOST env var (works for both local and Databricks Apps)
    2. SDK config host (fallback)
    """
    # First, try DATABRICKS_HOST env var directly
    host = os.environ.get("DATABRICKS_HOST", "")
    if host:
        # Ensure https:// prefix
        if not host.startswith("http"):
            host = f"https://{host}"
        print(f"[Config] Using DATABRICKS_HOST: {host}")
        return host

    # Fallback to SDK config
    try:
        client = get_workspace_client()
        host = client.config.host
        print(f"[Config] Using SDK config host: {host}")
        return host
    except Exception as e:
        print(f"[Config] Failed to get host from SDK: {e}")
        return ""


def get_current_user() -> dict:
    """Get current user information."""
    client = get_workspace_client()
    user = client.current_user.me()
    return {
        "user_name": user.user_name,
        "display_name": user.display_name or user.user_name,
        "id": user.id,
    }
