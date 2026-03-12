export interface User {
  user_name: string;
  display_name: string;
  id: string;
  is_approver: boolean;
  is_admin: boolean;
}

export interface AdminUser {
  id: number;
  email: string;
  display_name: string;
  created_at: string;
  created_by: string;
}

export interface Approver {
  id: number;
  email: string;
  display_name: string;
  is_active: boolean;
  created_at: string;
  created_by: string;
}

export interface ApprovalRequest {
  id: number;
  request_id: string;
  requester_email: string;
  requester_name: string;
  notebook_name: string;
  notebook_path: string;
  justification: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
  approver_email: string | null;
  approver_name: string | null;
  approval_notes: string | null;
  job_id: number | null;
  job_run_id: number | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  executed_at: string | null;
}

export interface JobStatus {
  run_id: number;
  job_id: number;
  state: string | null;
  result_state: string | null;
  run_page_url: string | null;
  start_time: number | null;
  end_time: number | null;
}

export interface AuditStats {
  total_requests: number;
  pending: number;
  approved: number;
  rejected: number;
  executed: number;
  failed: number;
  recent_activity: {
    date: string;
    count: number;
    status: string;
  }[];
}
