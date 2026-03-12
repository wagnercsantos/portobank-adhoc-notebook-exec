"""API routes for user information."""

import os
from typing import Optional
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from ..models import UserInfo
from ..config import get_current_user, IS_DATABRICKS_APP
from ..db import (
    is_admin as db_is_admin,
    is_approver as db_is_approver,
    get_all_admins,
    get_all_approvers,
    add_admin,
    remove_admin,
    add_approver,
    delete_approver,
)

router = APIRouter(prefix="/users", tags=["users"])

# List of approver emails (fallback from env var)
APPROVERS = os.environ.get("APPROVERS", "").split(",")


def get_user_from_header(x_forwarded_email: Optional[str] = None) -> dict:
    """Get user info from header or SDK."""
    if IS_DATABRICKS_APP and x_forwarded_email:
        return {
            "user_name": x_forwarded_email,
            "display_name": x_forwarded_email.split("@")[0],
            "id": x_forwarded_email,
        }
    return get_current_user()


@router.get("/me", response_model=UserInfo)
async def get_current_user_info(
    x_forwarded_email: Optional[str] = Header(None),
):
    """Get current user information."""
    user = get_user_from_header(x_forwarded_email)

    # Check if user is approver from database
    user_is_approver = await db_is_approver(user["user_name"])

    # Fallback to env var if database check fails
    if not user_is_approver and APPROVERS and APPROVERS[0]:
        user_is_approver = user["user_name"] in APPROVERS

    # Check if user is admin from database
    user_is_admin = await db_is_admin(user["user_name"])

    return UserInfo(
        user_name=user["user_name"],
        display_name=user["display_name"],
        id=user["id"],
        is_approver=user_is_approver,
        is_admin=user_is_admin,
    )


# Admin routes

class UserRole(BaseModel):
    email: str
    display_name: Optional[str] = None


@router.get("/admins")
async def list_admins(
    x_forwarded_email: Optional[str] = Header(None),
):
    """List all admins. Only accessible by admins."""
    user = get_user_from_header(x_forwarded_email)
    if not await db_is_admin(user["user_name"]):
        raise HTTPException(status_code=403, detail="Admin access required")

    admins = await get_all_admins()
    return {"admins": admins}


@router.post("/admins")
async def create_admin(
    data: UserRole,
    x_forwarded_email: Optional[str] = Header(None),
):
    """Add a new admin. Only accessible by admins."""
    user = get_user_from_header(x_forwarded_email)
    if not await db_is_admin(user["user_name"]):
        raise HTTPException(status_code=403, detail="Admin access required")

    display_name = data.display_name or data.email.split("@")[0]
    success = await add_admin(data.email, display_name, user["user_name"])

    if not success:
        raise HTTPException(status_code=400, detail="Failed to add admin (may already exist)")

    return {"message": f"Admin {data.email} added successfully"}


@router.delete("/admins/{email}")
async def delete_admin_user(
    email: str,
    x_forwarded_email: Optional[str] = Header(None),
):
    """Remove an admin. Only accessible by admins."""
    user = get_user_from_header(x_forwarded_email)
    if not await db_is_admin(user["user_name"]):
        raise HTTPException(status_code=403, detail="Admin access required")

    # Prevent self-removal
    if email.lower() == user["user_name"].lower():
        raise HTTPException(status_code=400, detail="Cannot remove yourself as admin")

    success = await remove_admin(email)
    if not success:
        raise HTTPException(status_code=404, detail="Admin not found")

    return {"message": f"Admin {email} removed successfully"}


@router.get("/approvers")
async def list_approvers(
    x_forwarded_email: Optional[str] = Header(None),
):
    """List all approvers. Only accessible by admins."""
    user = get_user_from_header(x_forwarded_email)
    if not await db_is_admin(user["user_name"]):
        raise HTTPException(status_code=403, detail="Admin access required")

    approvers = await get_all_approvers()
    return {"approvers": approvers}


@router.post("/approvers")
async def create_approver(
    data: UserRole,
    x_forwarded_email: Optional[str] = Header(None),
):
    """Add a new approver. Only accessible by admins."""
    user = get_user_from_header(x_forwarded_email)
    if not await db_is_admin(user["user_name"]):
        raise HTTPException(status_code=403, detail="Admin access required")

    display_name = data.display_name or data.email.split("@")[0]
    success = await add_approver(data.email, display_name, user["user_name"])

    if not success:
        raise HTTPException(status_code=400, detail="Failed to add approver (may already exist)")

    return {"message": f"Approver {data.email} added successfully"}


@router.delete("/approvers/{email}")
async def delete_approver_user(
    email: str,
    x_forwarded_email: Optional[str] = Header(None),
):
    """Remove an approver. Only accessible by admins."""
    user = get_user_from_header(x_forwarded_email)
    if not await db_is_admin(user["user_name"]):
        raise HTTPException(status_code=403, detail="Admin access required")

    success = await delete_approver(email)
    if not success:
        raise HTTPException(status_code=404, detail="Approver not found")

    return {"message": f"Approver {email} removed successfully"}
