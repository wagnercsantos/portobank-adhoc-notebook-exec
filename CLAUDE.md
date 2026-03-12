# PortoBank Notebook Approval System

## Project Overview

A **Databricks App** that provides a secure approval workflow for ad-hoc notebook execution in production environments. Users submit Jupyter notebooks for review, approvers can preview and approve/reject them, and approved notebooks are automatically executed as Databricks Jobs.

**Live App URL**: `https://portobank-adhoc-notebook-exec-6313129442315904.4.azure.databricksapps.com`

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Databricks App Platform                      │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React + Vite)     │     Backend (FastAPI)            │
│  - Static files served       │     - REST API endpoints         │
│  - Single Page Application   │     - Databricks SDK integration │
│                              │     - Lakebase PostgreSQL        │
└─────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
              Lakebase DB        Databricks Jobs      Workspace Files
              (PostgreSQL)       (Notebook Exec)      (Audit Storage)
```

## Tech Stack

### Backend
- **FastAPI** - Python async web framework
- **Databricks SDK** - Workspace client, Jobs API, Permissions API
- **asyncpg** - Async PostgreSQL driver for Lakebase
- **Pydantic** - Data validation and serialization

### Frontend
- **React 18** with TypeScript
- **Vite** - Build tool and dev server
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

### Database
- **Lakebase** (Databricks PostgreSQL) - Stores approval requests, admins, approvers

### Deployment
- **Databricks Apps** - Managed app hosting with automatic OAuth
- **app.yaml** - Configuration for resources and environment

## File Structure

```
portobank-adhoc-notebook-exec/
├── app.py                    # FastAPI main entry point
├── app.yaml                  # Databricks Apps configuration
├── requirements.txt          # Python dependencies
├── CLAUDE.md                 # This file (LLM context)
│
├── server/                   # Backend Python package
│   ├── __init__.py
│   ├── config.py             # Databricks client, env config
│   ├── db.py                 # Lakebase connection pool, schema
│   ├── models.py             # Pydantic models
│   ├── job_service.py        # Databricks Jobs creation/management
│   ├── notebook_service.py   # Notebook upload to workspace
│   └── routes/
│       ├── users.py          # /api/users/* - User info, admin/approver management
│       ├── requests.py       # /api/requests/* - Submit, approve, reject
│       └── audit.py          # /api/audit/* - Dashboard stats, history
│
├── frontend/                 # React application
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── dist/                 # Built static files (committed for deployment)
│   └── src/
│       ├── main.tsx          # React entry point
│       ├── App.tsx           # Router and layout
│       ├── types.ts          # TypeScript interfaces
│       ├── stores/
│       │   └── appStore.ts   # Zustand store (state + API calls)
│       ├── components/
│       │   ├── Layout.tsx    # Navigation sidebar
│       │   ├── RequestCard.tsx
│       │   ├── StatusBadge.tsx
│       │   ├── Modal.tsx
│       │   └── NotebookViewer.tsx
│       └── pages/
│           ├── SubmitRequest.tsx
│           ├── MyRequests.tsx
│           ├── PendingApprovals.tsx
│           ├── AuditDashboard.tsx
│           └── Admin.tsx
```

## Key Components

### Backend

#### `server/config.py`
- `get_workspace_client()` - Returns authenticated Databricks WorkspaceClient
- `get_workspace_host()` - Returns workspace URL from `DATABRICKS_HOST` env var
- `get_lakebase_credential()` - Gets JWT token for Lakebase auth
- `IS_DATABRICKS_APP` - Boolean to detect if running in Databricks Apps

#### `server/db.py`
- `DatabasePool` class with connection pooling
- `init_schema()` - Creates tables on startup
- Helper functions: `is_admin()`, `is_approver()`, `add_admin()`, etc.

#### `server/job_service.py`
- `create_approval_job()` - Creates and runs a Databricks Job for approved notebook
- `get_job_run_status()` - Checks job execution status

#### `server/routes/requests.py`
- `POST /api/requests/submit` - Upload notebook + justification
- `GET /api/requests/my-requests` - User's submitted requests
- `GET /api/requests/pending` - Pending requests for approvers
- `POST /api/requests/{id}/action` - Approve or reject
- `GET /api/requests/{id}/notebook` - Get notebook content (JSON)

### Frontend

#### `stores/appStore.ts`
Central Zustand store managing:
- `user` - Current user info (from `/api/users/me`)
- `config` - App config including `workspace_host`
- `myRequests`, `pendingRequests`, `allRequests` - Request lists
- `auditStats` - Dashboard statistics
- API methods: `fetchUser()`, `submitRequest()`, `processRequest()`, etc.

#### Key Components
- `RequestCard` - Displays request with status, actions, notebook viewer
- `NotebookViewer` - Renders Jupyter notebook cells (code + markdown)
- `Layout` - Sidebar navigation with role-based menu items

## Database Schema

### `approval_requests`
```sql
CREATE TABLE approval_requests (
    id SERIAL PRIMARY KEY,
    request_id UUID DEFAULT gen_random_uuid() UNIQUE,
    requester_email VARCHAR(255) NOT NULL,
    requester_name VARCHAR(255) NOT NULL,
    notebook_name VARCHAR(500) NOT NULL,
    notebook_path VARCHAR(1000) NOT NULL,
    notebook_content TEXT,              -- Stored for audit/preview
    justification TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending|executed|rejected|failed
    approver_email VARCHAR(255),
    approver_name VARCHAR(255),
    approval_notes TEXT,
    job_id BIGINT,                      -- Databricks Job ID
    job_run_id BIGINT,                  -- Databricks Run ID
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    approved_at TIMESTAMP,
    executed_at TIMESTAMP
);
```

### `admins`
```sql
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255),
    created_at TIMESTAMP,
    created_by VARCHAR(255)
);
```

### `approvers`
```sql
CREATE TABLE approvers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    created_by VARCHAR(255)
);
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABRICKS_HOST` | Workspace URL (no https://) | `adb-123.4.azuredatabricks.net` |
| `PGHOST` | Lakebase database host | `ep-xxx.database.brazilsouth.azuredatabricks.net` |
| `PGPORT` | Database port | `5432` |
| `PGDATABASE` | Database name | `approvals` |
| `PGUSER` | Database user | Set by Lakebase resource |
| `PGPASSWORD` | Database password | Set by Lakebase resource |
| `APP_NAME` | Display name | `PortoBank Notebook Approval System` |
| `DATABRICKS_APP_NAME` | Set by platform | Auto-injected |

## Deployment

### Prerequisites
- Databricks CLI configured with profile `notebook-approval-azure`
- Lakebase database created and configured in `app.yaml`

### Deploy Commands
```bash
# Upload code to workspace
databricks workspace import-dir . \
  "/Workspace/Users/wagner.santos@databricks.com/portobank-adhoc-notebook-exec" \
  --overwrite --profile=notebook-approval-azure

# Deploy app
databricks apps deploy portobank-adhoc-notebook-exec \
  --source-code-path "/Workspace/Users/wagner.santos@databricks.com/portobank-adhoc-notebook-exec" \
  --profile notebook-approval-azure
```

### Troubleshooting Deployment
If deployment fails with `.venv` cache errors:
```bash
# Stop the app to clear compute
databricks apps stop portobank-adhoc-notebook-exec --profile notebook-approval-azure

# Wait ~30 seconds for compute to clear

# Start fresh
databricks apps start portobank-adhoc-notebook-exec --profile notebook-approval-azure

# Then deploy
databricks apps deploy ...
```

## User Roles

| Role | Permissions |
|------|------------|
| **User** | Submit requests, view own requests |
| **Approver** | All user permissions + approve/reject requests, view audit dashboard |
| **Admin** | All approver permissions + manage admins and approvers |

## API Authentication

In Databricks Apps, user identity comes from the `X-Forwarded-Email` header (auto-injected by the platform). The backend extracts this in route handlers:

```python
def get_user_from_header(x_forwarded_email: Optional[str] = Header(None)) -> dict:
    if IS_DATABRICKS_APP and x_forwarded_email:
        return {
            "user_name": x_forwarded_email,
            "display_name": x_forwarded_email.split("@")[0],
            "id": x_forwarded_email,
        }
    return get_current_user()  # SDK fallback for local dev
```

## Common Development Tasks

### Add a new API endpoint
1. Create route in `server/routes/` or add to existing file
2. Register router in `app.py` if new file
3. Add corresponding API call in `frontend/src/stores/appStore.ts`

### Add a new page
1. Create component in `frontend/src/pages/`
2. Add route in `frontend/src/App.tsx`
3. Add navigation link in `frontend/src/components/Layout.tsx`

### Modify database schema
1. Update table creation in `server/db.py` `init_schema()`
2. Update Pydantic models in `server/models.py`
3. Update TypeScript types in `frontend/src/types.ts`

### Build frontend for deployment
```bash
cd frontend
npm run build
# dist/ folder is committed and served by FastAPI
```

## Status Flow

```
[pending] ──approve──► [executed] ──job fails──► [failed]
    │
    └──reject──► [rejected]
```

## Local Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Databricks CLI configured with profile `notebook-approval-azure`
- Access to Lakebase database

### Backend Setup
```bash
cd /Users/wagner.santos/code/portobank-adhoc-notebook-exec

# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export PGHOST="ep-delicate-waterfall-e5rfdabs.database.brazilsouth.azuredatabricks.net"
export PGPORT="5432"
export PGDATABASE="approvals"
export PGUSER="<from-lakebase>"
export PGPASSWORD="<from-lakebase>"
export DATABRICKS_HOST="https://adb-6313129442315904.4.azuredatabricks.net"
export DATABRICKS_PROFILE="notebook-approval-azure"
export APP_NAME="PortoBank Notebook Approval System"

# Run server
python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Run dev server (proxies API to backend)
npm run dev

# Build for production (required before deploy)
npm run build
```

### Testing Locally
- Frontend dev: http://localhost:5173 (Vite dev server with HMR)
- Backend API: http://localhost:8000/api/
- API docs: http://localhost:8000/docs (Swagger UI)

### Local Auth Simulation
When running locally (not in Databricks Apps), the backend uses Databricks SDK to get the current user. Make sure your Databricks CLI profile is configured correctly.

---

## Next Steps / Roadmap

### High Priority
- [ ] **Email Notifications**: Send email to approvers when new request submitted
- [ ] **Slack Integration**: Post notifications to Slack channel
- [ ] **Job Status Polling**: Auto-refresh job status after approval
- [ ] **Failed Job Handling**: Allow re-execution of failed jobs

### Medium Priority
- [ ] **Request Expiration**: Auto-reject requests after X days
- [ ] **Batch Approval**: Approve multiple requests at once
- [ ] **Search/Filter**: Filter requests by date, status, requester
- [ ] **Export Audit Logs**: Download audit trail as CSV/Excel

### Low Priority / Nice to Have
- [ ] **Dark Mode**: Theme toggle for UI
- [ ] **Request Comments**: Allow discussion thread on requests
- [ ] **Scheduled Execution**: Option to schedule approved notebooks
- [ ] **Notebook Diff**: Compare notebook versions
- [ ] **Custom Approval Workflows**: Multi-level approval chains

### Technical Debt
- [ ] **Unit Tests**: Add pytest tests for backend routes
- [ ] **E2E Tests**: Add Playwright tests for frontend
- [ ] **Error Boundaries**: Better error handling in React
- [ ] **Logging**: Structured logging with correlation IDs
- [ ] **Metrics**: Add observability/monitoring

---

## Known Issues

1. **Large Notebooks**: Notebooks > 1MB may timeout during upload
2. **Token Expiry**: Lakebase tokens expire after ~1 hour; pool refresh needed
3. **Concurrent Approvals**: No optimistic locking on approval actions

---

## Important Notes

1. **Notebook Storage**: Notebooks are stored both in Lakebase (for preview) and in Databricks Workspace (for execution)

2. **Job Execution**: Jobs use serverless compute (no cluster config needed)

3. **Job URL Construction**: Uses `config.workspace_host` + `/jobs/{job_id}/runs/{run_id}`

4. **OAuth Token Refresh**: Lakebase credentials expire; `DatabasePool.refresh_token()` handles this

5. **Frontend Build**: The `frontend/dist/` folder must be committed since Databricks Apps doesn't run npm build

---

## Useful Commands

```bash
# Check app status
databricks apps get portobank-adhoc-notebook-exec --profile notebook-approval-azure

# View app logs
databricks apps get-logs portobank-adhoc-notebook-exec --profile notebook-approval-azure

# Stop app
databricks apps stop portobank-adhoc-notebook-exec --profile notebook-approval-azure

# Start app
databricks apps start portobank-adhoc-notebook-exec --profile notebook-approval-azure

# Full redeploy
databricks workspace import-dir . "/Workspace/Users/wagner.santos@databricks.com/portobank-adhoc-notebook-exec" --overwrite --profile=notebook-approval-azure && \
databricks apps deploy portobank-adhoc-notebook-exec --source-code-path "/Workspace/Users/wagner.santos@databricks.com/portobank-adhoc-notebook-exec" --profile notebook-approval-azure
```

---

## Contact

- **Owner**: wagner.santos@databricks.com
- **Workspace**: adb-6313129442315904.4.azuredatabricks.net
- **App URL**: https://portobank-adhoc-notebook-exec-6313129442315904.4.azure.databricksapps.com
