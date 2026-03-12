"""Pydantic models for the approval workflow."""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class RequestStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXECUTED = "executed"
    FAILED = "failed"


class ApprovalRequestCreate(BaseModel):
    notebook_name: str
    justification: str


class ApprovalRequestResponse(BaseModel):
    id: int
    request_id: str
    requester_email: str
    requester_name: str
    notebook_name: str
    notebook_path: str
    justification: str
    status: str
    approver_email: Optional[str] = None
    approver_name: Optional[str] = None
    approval_notes: Optional[str] = None
    job_id: Optional[int] = None
    job_run_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    approved_at: Optional[datetime] = None
    executed_at: Optional[datetime] = None


class ApprovalAction(BaseModel):
    action: str  # "approve" or "reject"
    notes: Optional[str] = None


class UserInfo(BaseModel):
    user_name: str
    display_name: str
    id: str
    is_approver: bool = False
    is_admin: bool = False
