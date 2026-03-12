"""API routes for approval requests."""

from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Header
from ..db import db, get_table_name, is_approver
from ..models import ApprovalRequestResponse, ApprovalAction
from ..notebook_service import save_notebook_for_audit
from ..job_service import create_approval_job, get_job_run_status
from ..config import get_current_user, IS_DATABRICKS_APP

router = APIRouter(prefix="/requests", tags=["requests"])


def get_user_from_header(x_forwarded_email: Optional[str] = None) -> dict:
    """Get user info from header or SDK."""
    if IS_DATABRICKS_APP and x_forwarded_email:
        return {
            "user_name": x_forwarded_email,
            "display_name": x_forwarded_email.split("@")[0],
            "id": x_forwarded_email,
        }
    return get_current_user()


@router.post("/submit", response_model=ApprovalRequestResponse)
async def submit_request(
    notebook: UploadFile = File(...),
    justification: str = Form(...),
    x_forwarded_email: Optional[str] = Header(None),
):
    """Submit a new notebook execution request for approval."""
    pool = await db.get_pool()
    if pool is None:
        raise HTTPException(status_code=503, detail="Database not available")

    user = get_user_from_header(x_forwarded_email)

    # Read notebook content
    notebook_content = await notebook.read()
    notebook_name = notebook.filename or "unnamed_notebook"

    async with pool.acquire() as conn:
        # Create the request record first to get request_id
        row = await conn.fetchrow(
            f"""
            INSERT INTO {get_table_name("approval_requests")}
                (requester_email, requester_name, notebook_name, notebook_path, justification, status)
            VALUES ($1, $2, $3, '', $4, 'pending')
            RETURNING *
            """,
            user["user_name"],
            user["display_name"],
            notebook_name,
            justification,
        )

        request_id = str(row["request_id"])

        # Save notebook to workspace for audit
        try:
            audit_path = await save_notebook_for_audit(
                notebook_content=notebook_content,
                request_id=request_id,
                notebook_name=notebook_name,
                requester_email=user["user_name"],
            )

            # Update the record with the notebook path
            row = await conn.fetchrow(
                f"""
                UPDATE {get_table_name("approval_requests")}
                SET notebook_path = $1, notebook_content = $2
                WHERE request_id = $3
                RETURNING *
                """,
                audit_path,
                notebook_content.decode("utf-8", errors="replace"),
                row["request_id"],
            )
        except Exception as e:
            # If notebook save fails, delete the request
            await conn.execute(
                f"DELETE FROM {get_table_name('approval_requests')} WHERE request_id = $1",
                row["request_id"],
            )
            raise HTTPException(
                status_code=500,
                detail=f"Failed to save notebook: {str(e)}",
            )

    return ApprovalRequestResponse(
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


@router.get("/my-requests", response_model=List[ApprovalRequestResponse])
async def get_my_requests(
    x_forwarded_email: Optional[str] = Header(None),
):
    """Get all requests submitted by the current user."""
    pool = await db.get_pool()
    if pool is None:
        raise HTTPException(status_code=503, detail="Database not available")

    user = get_user_from_header(x_forwarded_email)

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"""
            SELECT * FROM {get_table_name("approval_requests")}
            WHERE requester_email = $1
            ORDER BY created_at DESC
            """,
            user["user_name"],
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


@router.get("/pending", response_model=List[ApprovalRequestResponse])
async def get_pending_requests(
    x_forwarded_email: Optional[str] = Header(None),
):
    """Get all pending requests (for approvers)."""
    pool = await db.get_pool()
    if pool is None:
        raise HTTPException(status_code=503, detail="Database not available")

    user = get_user_from_header(x_forwarded_email)

    # Check if user is an approver (from database)
    user_is_approver = await is_approver(user["user_name"])
    if not user_is_approver:
        raise HTTPException(status_code=403, detail="Not authorized to view pending requests")

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"""
            SELECT * FROM {get_table_name("approval_requests")}
            WHERE status = 'pending'
            ORDER BY created_at ASC
            """
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


@router.get("/{request_id}", response_model=ApprovalRequestResponse)
async def get_request(request_id: str):
    """Get a specific request by ID."""
    pool = await db.get_pool()
    if pool is None:
        raise HTTPException(status_code=503, detail="Database not available")

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"SELECT * FROM {get_table_name('approval_requests')} WHERE request_id = $1",
            request_id,
        )

    if not row:
        raise HTTPException(status_code=404, detail="Request not found")

    return ApprovalRequestResponse(
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


@router.post("/{request_id}/action", response_model=ApprovalRequestResponse)
async def process_request(
    request_id: str,
    action: ApprovalAction,
    x_forwarded_email: Optional[str] = Header(None),
):
    """Approve or reject a request."""
    pool = await db.get_pool()
    if pool is None:
        raise HTTPException(status_code=503, detail="Database not available")

    user = get_user_from_header(x_forwarded_email)

    # Check if user is an approver (from database)
    user_is_approver = await is_approver(user["user_name"])
    if not user_is_approver:
        raise HTTPException(status_code=403, detail="Not authorized to approve/reject requests")

    async with pool.acquire() as conn:
        # Get the current request
        row = await conn.fetchrow(
            f"SELECT * FROM {get_table_name('approval_requests')} WHERE request_id = $1",
            request_id,
        )

        if not row:
            raise HTTPException(status_code=404, detail="Request not found")

        if row["status"] != "pending":
            raise HTTPException(status_code=400, detail="Request is not pending")

        now = datetime.now()

        if action.action == "approve":
            # Create and run the job
            try:
                job_id, run_id = await create_approval_job(
                    notebook_path=row["notebook_path"],
                    request_id=request_id,
                    requester_email=row["requester_email"],
                    requester_name=row["requester_name"],
                    approver_email=user["user_name"],
                    approver_name=user["display_name"],
                    justification=row["justification"],
                )

                row = await conn.fetchrow(
                    f"""
                    UPDATE {get_table_name("approval_requests")}
                    SET status = 'approved',
                        approver_email = $1,
                        approver_name = $2,
                        approval_notes = $3,
                        approved_at = $4,
                        updated_at = $4,
                        job_id = $5,
                        job_run_id = $6
                    WHERE request_id = $7
                    RETURNING *
                    """,
                    user["user_name"],
                    user["display_name"],
                    action.notes,
                    now,
                    job_id,
                    run_id,
                    request_id,
                )
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to create job: {str(e)}",
                )
        elif action.action == "reject":
            row = await conn.fetchrow(
                f"""
                UPDATE {get_table_name("approval_requests")}
                SET status = 'rejected',
                    approver_email = $1,
                    approver_name = $2,
                    approval_notes = $3,
                    updated_at = $4
                WHERE request_id = $5
                RETURNING *
                """,
                user["user_name"],
                user["display_name"],
                action.notes,
                now,
                request_id,
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid action")

    return ApprovalRequestResponse(
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


@router.get("/{request_id}/job-status")
async def get_job_status(request_id: str):
    """Get the job run status for an approved request."""
    pool = await db.get_pool()
    if pool is None:
        raise HTTPException(status_code=503, detail="Database not available")

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"SELECT job_run_id FROM {get_table_name('approval_requests')} WHERE request_id = $1",
            request_id,
        )

    if not row:
        raise HTTPException(status_code=404, detail="Request not found")

    if not row["job_run_id"]:
        raise HTTPException(status_code=400, detail="No job run associated with this request")

    try:
        status = await get_job_run_status(row["job_run_id"])
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get job status: {str(e)}")


@router.get("/{request_id}/notebook")
async def get_notebook_content(request_id: str):
    """Get the notebook content for a request (parsed as JSON)."""
    import json

    pool = await db.get_pool()
    if pool is None:
        raise HTTPException(status_code=503, detail="Database not available")

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"SELECT notebook_content, notebook_name FROM {get_table_name('approval_requests')} WHERE request_id = $1",
            request_id,
        )

    if not row:
        raise HTTPException(status_code=404, detail="Request not found")

    if not row["notebook_content"]:
        raise HTTPException(status_code=404, detail="Notebook content not available")

    try:
        # Parse the notebook content as JSON (Jupyter notebook format)
        notebook_data = json.loads(row["notebook_content"])
        return notebook_data
    except json.JSONDecodeError:
        # If it's not valid JSON, return it as raw content
        return {
            "cells": [
                {
                    "cell_type": "code",
                    "source": row["notebook_content"].split("\n"),
                    "outputs": [],
                }
            ],
            "metadata": {
                "kernelspec": {
                    "display_name": "Python",
                    "language": "python",
                }
            },
        }
