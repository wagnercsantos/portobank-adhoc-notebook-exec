import { useEffect, useState, useMemo } from 'react';
import { ClipboardList, RefreshCw, Search } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import RequestCard from '../components/RequestCard';
import Pagination from '../components/Pagination';

const ITEMS_PER_PAGE = 10;

export default function PendingApprovals() {
  const { pendingRequests, fetchPendingRequests, processRequest, loading, error } =
    useAppStore();

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchPendingRequests();
  }, [fetchPendingRequests]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleApprove = async (requestId: string, notes: string) => {
    await processRequest(requestId, 'approve', notes);
  };

  const handleReject = async (requestId: string, notes: string) => {
    await processRequest(requestId, 'reject', notes);
  };

  const filteredRequests = useMemo(() => {
    if (!searchTerm) return pendingRequests;
    const search = searchTerm.toLowerCase();
    return pendingRequests.filter(
      (r) =>
        r.notebook_name.toLowerCase().includes(search) ||
        r.requester_name.toLowerCase().includes(search) ||
        r.requester_email.toLowerCase().includes(search) ||
        r.justification.toLowerCase().includes(search)
    );
  }, [pendingRequests, searchTerm]);

  // Paginated requests
  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRequests.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRequests, currentPage]);

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

      {/* Search */}
      {pendingRequests.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-4">
            <Search className="w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by notebook, requester, or justification..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-gray-500">
              {filteredRequests.length} pending request{filteredRequests.length !== 1 ? 's' : ''}
            </span>
          </div>
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
      ) : paginatedRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No matching requests
          </h3>
          <p className="text-gray-500">
            No requests match your search criteria.
          </p>
          <button
            onClick={() => setSearchTerm('')}
            className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-800"
          >
            Clear search
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <strong>Note:</strong> Approving a request will immediately create and
              execute a job with the attached notebook. The requester will be granted
              view access to the job.
            </p>
          </div>
          <div>
            {paginatedRequests.map((request) => (
              <RequestCard
                key={request.request_id}
                request={request}
                showApprovalActions
                onApprove={(notes) => handleApprove(request.request_id, notes)}
                onReject={(notes) => handleReject(request.request_id, notes)}
              />
            ))}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredRequests.length}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </>
      )}
    </div>
  );
}
