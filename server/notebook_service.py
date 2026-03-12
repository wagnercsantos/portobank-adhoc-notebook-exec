"""Service for managing notebooks in Databricks workspace."""

import base64
import os
from datetime import datetime
from typing import Optional
from databricks.sdk.service.workspace import ImportFormat, Language
from .config import get_workspace_client

# Path where notebooks will be stored for audit
AUDIT_NOTEBOOK_PATH = "/Workspace/Users/78181b98-aaf0-4ef5-af9b-346b6f089460/audit"


def get_audit_path(request_id: str, notebook_name: str) -> str:
    """Generate the audit path for a notebook."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = notebook_name.replace("/", "_").replace(" ", "_")
    return f"{AUDIT_NOTEBOOK_PATH}/{timestamp}_{request_id}_{safe_name}"


async def save_notebook_for_audit(
    notebook_content: bytes,
    request_id: str,
    notebook_name: str,
    requester_email: str,
) -> str:
    """Save notebook to workspace for audit purposes."""
    client = get_workspace_client()

    # Ensure audit directory exists
    try:
        client.workspace.mkdirs(AUDIT_NOTEBOOK_PATH)
    except Exception:
        pass  # Directory might already exist

    audit_path = get_audit_path(request_id, notebook_name)

    # Determine format from notebook name using SDK enums
    if notebook_name.endswith(".py"):
        language = Language.PYTHON
        format_type = ImportFormat.SOURCE
    elif notebook_name.endswith(".sql"):
        language = Language.SQL
        format_type = ImportFormat.SOURCE
    elif notebook_name.endswith(".ipynb"):
        language = None
        format_type = ImportFormat.JUPYTER
    else:
        # Default to Python source
        language = Language.PYTHON
        format_type = ImportFormat.SOURCE

    # Import the notebook
    content_b64 = base64.b64encode(notebook_content).decode("utf-8")

    client.workspace.import_(
        path=audit_path,
        content=content_b64,
        format=format_type,
        language=language,
        overwrite=True,
    )

    return audit_path


async def get_notebook_content(path: str) -> Optional[bytes]:
    """Get notebook content from workspace."""
    client = get_workspace_client()
    try:
        export = client.workspace.export(path=path, format=ImportFormat.SOURCE)
        if export.content:
            return base64.b64decode(export.content)
        return None
    except Exception as e:
        print(f"Error getting notebook content: {e}")
        return None
