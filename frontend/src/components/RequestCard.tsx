import { useState } from 'react';
import {
  FileText,
  User,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Eye,
} from 'lucide-react';
import type { ApprovalRequest } from '../types';
import StatusBadge from './StatusBadge';
import Modal from './Modal';
import NotebookViewer from './NotebookViewer';

interface RequestCardProps {
  request: ApprovalRequest;
  showApprovalActions?: boolean;
  onApprove?: (notes: string) => void;
  onReject?: (notes: string) => void;
  onViewNotebook?: () => void;
}

export default function RequestCard({
  request,
  showApprovalActions = false,
  onApprove,
  onReject,
}: RequestCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showNotebook, setShowNotebook] = useState(false);

  const handleApprove = async () => {
    if (onApprove) {
      setProcessing(true);
      try {
        await onApprove(notes);
      } finally {
        setProcessing(false);
      }
    }
  };

  const handleReject = async () => {
    if (onReject) {
      setProcessing(true);
      try {
        await onReject(notes);
      } finally {
        setProcessing(false);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-lg">{request.notebook_name}</h3>
            <StatusBadge status={request.status} />
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {request.requester_name}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(request.created_at)}
            </span>
          </div>

          <p className="text-gray-700 mb-2">
            <strong>Justification:</strong> {request.justification}
          </p>

          <button
            onClick={() => setShowNotebook(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Eye className="w-4 h-4" />
            View Notebook
          </button>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-500 hover:text-gray-700"
        >
          {expanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Notebook Viewer Modal */}
      <Modal
        isOpen={showNotebook}
        onClose={() => setShowNotebook(false)}
        title={`Notebook: ${request.notebook_name}`}
        size="full"
      >
        <NotebookViewer requestId={request.request_id} notebookName={request.notebook_name} />
      </Modal>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Request ID</p>
              <p className="font-mono text-xs">{request.request_id}</p>
            </div>
            <div>
              <p className="text-gray-500">Notebook Path</p>
              <p className="font-mono text-xs truncate">{request.notebook_path}</p>
            </div>
            {request.approver_name && (
              <>
                <div>
                  <p className="text-gray-500">Approved By</p>
                  <p>{request.approver_name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Approved At</p>
                  <p>{request.approved_at ? formatDate(request.approved_at) : '-'}</p>
                </div>
              </>
            )}
            {request.approval_notes && (
              <div className="col-span-2">
                <p className="text-gray-500">Approval Notes</p>
                <p>{request.approval_notes}</p>
              </div>
            )}
            {request.job_id && (
              <div className="col-span-2">
                <p className="text-gray-500 mb-1">Job Information</p>
                <a
                  href={`/jobs/${request.job_id}/runs/${request.job_run_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                >
                  View Job Run <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {showApprovalActions && request.status === 'pending' && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes (optional)..."
            className="w-full p-2 border border-gray-300 rounded-lg mb-3 text-sm"
            rows={2}
          />
          <div className="flex gap-3">
            <button
              onClick={handleApprove}
              disabled={processing}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Processing...' : 'Approve & Execute'}
            </button>
            <button
              onClick={handleReject}
              disabled={processing}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Processing...' : 'Reject'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
