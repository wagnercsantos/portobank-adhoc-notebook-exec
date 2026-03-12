"""Service for creating and managing Databricks jobs."""

from datetime import datetime
from typing import Optional
from databricks.sdk.service.jobs import (
    Task,
    NotebookTask,
)
from .config import get_workspace_client


async def create_approval_job(
    notebook_path: str,
    request_id: str,
    requester_email: str,
    requester_name: str,
    approver_email: str,
    approver_name: str,
    justification: str,
) -> tuple[int, int]:
    """
    Create and run a job for the approved notebook.

    Returns:
        tuple[int, int]: (job_id, run_id)
    """
    client = get_workspace_client()

    # Create job name with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    job_name = f"Approved_Execution_{request_id[:8]}_{timestamp}"

    # Tags for tracking
    tags = {
        "approval_request_id": request_id,
        "requester_email": requester_email,
        "requester_name": requester_name,
        "approver_email": approver_email,
        "approver_name": approver_name,
        "created_at": datetime.now().isoformat(),
        "source": "notebook-approval-app",
    }

    # Create the job with serverless compute
    job = client.jobs.create(
        name=job_name,
        tasks=[
            Task(
                task_key="run_approved_notebook",
                notebook_task=NotebookTask(
                    notebook_path=notebook_path,
                ),
                # Use serverless compute
                environment_key="default",
            )
        ],
        tags=tags,
        # Grant the requester permission to view the job
        access_control_list=[
            {
                "user_name": requester_email,
                "permission_level": "CAN_VIEW",
            }
        ],
        # Set serverless environment
        environments=[
            {
                "environment_key": "default",
                "spec": {
                    "client": "1",
                },
            }
        ],
    )

    job_id = job.job_id

    # Run the job immediately
    run = client.jobs.run_now(job_id=job_id)
    run_id = run.run_id

    return job_id, run_id


async def get_job_run_status(run_id: int) -> dict:
    """Get the status of a job run."""
    client = get_workspace_client()
    run = client.jobs.get_run(run_id=run_id)

    return {
        "run_id": run.run_id,
        "job_id": run.job_id,
        "state": run.state.life_cycle_state.value if run.state else None,
        "result_state": run.state.result_state.value if run.state and run.state.result_state else None,
        "run_page_url": run.run_page_url,
        "start_time": run.start_time,
        "end_time": run.end_time,
    }


async def get_job_details(job_id: int) -> dict:
    """Get job details including tags."""
    client = get_workspace_client()
    job = client.jobs.get(job_id=job_id)

    return {
        "job_id": job.job_id,
        "name": job.settings.name if job.settings else None,
        "tags": job.settings.tags if job.settings else {},
        "created_time": job.created_time,
    }
