import { useEffect } from 'react';
import { ClipboardList, RefreshCw } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import RequestCard from '../components/RequestCard';

export default function PendingApprovals() {
  const { pendingRequests, fetchPendingRequests, processRequest, loading, error } =
    useAppStore();

  useEffect(() => {
    fetchPendingRequests();
  }, [fetchPendingRequests]);

  const handleApprove = async (requestId: string, notes: string) => {
    await processRequest(requestId, 'approve', notes);
  };

  const handleReject = async (requestId: string, notes: string) => {
    await processRequest(requestId, 'reject', notes);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Pending Approvals</h1>
          <p className="text-gray-500">
            Review and approve notebook execution requests
          </p>
        </div>
        <button
          onClick={() => fetchPendingRequests()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {loading && pendingRequests.length === 0 ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading pending requests...</p>
        </div>
      ) : pendingRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No pending requests
          </h3>
          <p className="text-gray-500">
            All notebook execution requests have been processed.
          </p>
        </div>
      ) : (
        <div>
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <strong>Note:</strong> Approving a request will immediately create and
              execute a job with the attached notebook. The requester will be granted
              view access to the job.
            </p>
          </div>
          {pendingRequests.map((request) => (
            <RequestCard
              key={request.request_id}
              request={request}
              showApprovalActions
              onApprove={(notes) => handleApprove(request.request_id, notes)}
              onReject={(notes) => handleReject(request.request_id, notes)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
