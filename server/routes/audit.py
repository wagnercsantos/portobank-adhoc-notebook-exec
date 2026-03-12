"""API routes for audit trail."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Header
from ..db import db, get_table_name, is_approver
from ..models import ApprovalRequestResponse
from ..config import IS_DATABRICKS_APP

router = APIRouter(prefix="/audit", tags=["audit"])


def get_user_from_header(x_forwarded_email: Optional[str] = None) -> dict:
    """Get user info from header or SDK."""
    if IS_DATABRICKS_APP and x_forwarded_email:
        return {
            "user_name": x_forwarded_email,
            "display_name": x_forwarded_email.split("@")[0],
            "id": x_forwarded_email,
        }
    from ..config import get_current_user
    return get_current_user()


@router.get("/all-requests", response_model=List[ApprovalRequestResponse])
async def get_all_requests(
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    x_forwarded_email: Optional[str] = Header(None),
):
    """Get all requests for audit purposes (approvers only)."""
    pool = await db.get_pool()
    if pool is None:
        raise HTTPException(status_code=503, detail="Database not available")

    user = get_user_from_header(x_forwarded_email)

    # Check if user is an approver/auditor (from database)
    user_is_approver = await is_approver(user["user_name"])
    if not user_is_approver:
        raise HTTPException(status_code=403, detail="Not authorized to access audit trail")

    async with pool.acquire() as conn:
        if status:
            rows = await conn.fetch(
                f"""
                SELECT * FROM {get_table_name("approval_requests")}
                WHERE status = $1
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
                """,
                status,
                limit,
                offset,
            )
        else:
            rows = await conn.fetch(
                f"""
                SELECT * FROM {get_table_name("approval_requests")}
                ORDER BY created_at DESC
                LIMIT $1 OFFSET $2
                """,
                limit,
                offset,
            )

    return [
        ApprovalRequestResponse(
            id=row["id"],
            request_id=str(row["request_id"]),
            requester_email=row["requester_email"],
            requester_name=row["requester_name"],
            notebook_name=row["notebook_name"],
            notebook_path=row["notebook_path"],
            justification=row["justification"],
            status=row["status"],
            approver_email=row["approver_email"],
            approver_name=row["approver_name"],
            approval_notes=row["approval_notes"],
            job_id=row["job_id"],
            job_run_id=row["job_run_id"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            approved_at=row["approved_at"],
            executed_at=row["executed_at"],
        )
        for row in rows
    ]


@router.get("/stats")
async def get_audit_stats(
    x_forwarded_email: Optional[str] = Header(None),
):
    """Get statistics for audit dashboard."""
    pool = await db.get_pool()
    if pool is None:
        raise HTTPException(status_code=503, detail="Database not available")

    user = get_user_from_header(x_forwarded_email)

    # Check if user is an approver/auditor (from database)
    user_is_approver = await is_approver(user["user_name"])
    if not user_is_approver:
        raise HTTPException(status_code=403, detail="Not authorized to access audit stats")

    async with pool.acquire() as conn:
        stats = await conn.fetchrow(
            f"""
            SELECT
                COUNT(*) as total_requests,
                COUNT(*) FILTER (WHERE status = 'pending') as pending,
                COUNT(*) FILTER (WHERE status = 'approved') as approved,
                COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
                COUNT(*) FILTER (WHERE status = 'executed') as executed,
                COUNT(*) FILTER (WHERE status = 'failed') as failed
            FROM {get_table_name("approval_requests")}
            """
        )

        recent_activity = await conn.fetch(
            f"""
            SELECT
                DATE(created_at) as date,
                COUNT(*) as count,
                status
            FROM {get_table_name("approval_requests")}
            WHERE created_at > CURRENT_DATE - INTERVAL '30 days'
            GROUP BY DATE(created_at), status
            ORDER BY date DESC
            """
        )

    return {
        "total_requests": stats["total_requests"],
        "pending": stats["pending"],
        "approved": stats["approved"],
        "rejected": stats["rejected"],
        "executed": stats["executed"],
        "failed": stats["failed"],
        "recent_activity": [
            {
                "date": str(row["date"]),
                "count": row["count"],
                "status": row["status"],
            }
            for row in recent_activity
        ],
    }


@router.get("/notebook-content/{request_id}")
async def get_notebook_content(
    request_id: str,
    x_forwarded_email: Optional[str] = Header(None),
):
    """Get the stored notebook content for audit."""
    pool = await db.get_pool()
    if pool is None:
        raise HTTPException(status_code=503, detail="Database not available")

    user = get_user_from_header(x_forwarded_email)

    # Check if user is an approver/auditor (from database)
    user_is_approver = await is_approver(user["user_name"])
    if not user_is_approver:
        raise HTTPException(status_code=403, detail="Not authorized to access notebook content")

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"""
            SELECT notebook_content, notebook_name, notebook_path
            FROM {get_table_name("approval_requests")}
            WHERE request_id = $1
            """,
            request_id,
        )

    if not row:
        raise HTTPException(status_code=404, detail="Request not found")

    return {
        "notebook_name": row["notebook_name"],
        "notebook_path": row["notebook_path"],
        "content": row["notebook_content"],
    }
