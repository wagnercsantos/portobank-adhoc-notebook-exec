import { useEffect, useState, useMemo } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import RequestCard from '../components/RequestCard';
import Filters from '../components/Filters';
import Pagination from '../components/Pagination';
import MetricsCharts from '../components/MetricsCharts';

const ITEMS_PER_PAGE = 10;

export default function AuditDashboard() {
  const {
    allRequests,
    auditStats,
    fetchAllRequests,
    fetchAuditStats,
    loading,
    error,
  } = useAppStore();

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // View state
  const [showMetrics, setShowMetrics] = useState(true);

  useEffect(() => {
    fetchAllRequests();
    fetchAuditStats();
  }, [fetchAllRequests, fetchAuditStats]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, userFilter, dateFrom, dateTo]);

  const filteredRequests = useMemo(() => {
    return allRequests.filter((r) => {
      // Status filter
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;

      // User filter
      if (userFilter) {
        const search = userFilter.toLowerCase();
        if (
          !r.requester_name.toLowerCase().includes(search) &&
          !r.requester_email.toLowerCase().includes(search)
        ) {
          return false;
        }
      }

      // Date filters
      const requestDate = new Date(r.created_at);
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (requestDate < fromDate) return false;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (requestDate > toDate) return false;
      }

      return true;
    });
  }, [allRequests, statusFilter, userFilter, dateFrom, dateTo]);

  // Paginated requests
  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRequests.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRequests, currentPage]);

  const clearFilters = () => {
    setStatusFilter('all');
    setUserFilter('');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Audit Dashboard</h1>
          <p className="text-gray-500">
            Complete history of all notebook execution requests
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMetrics(!showMetrics)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              showMetrics
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Metrics
          </button>
          <button
            onClick={() => {
              fetchAllRequests();
              fetchAuditStats();
            }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* Metrics Dashboard */}
      {showMetrics && (
        <div className="mb-8">
          <MetricsCharts stats={auditStats} />
        </div>
      )}

      {/* Filters */}
      <Filters
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        userFilter={userFilter}
        onUserChange={setUserFilter}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        onClearFilters={clearFilters}
      />

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-500">
          Showing {filteredRequests.length} of {allRequests.length} requests
        </span>
      </div>

      {/* Request List */}
      {loading && allRequests.length === 0 ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading audit data...</p>
        </div>
      ) : paginatedRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No requests found
          </h3>
          <p className="text-gray-500">
            {statusFilter === 'all' && !userFilter && !dateFrom && !dateTo
              ? 'No notebook execution requests have been made yet.'
              : 'No requests match your filter criteria.'}
          </p>
          {(statusFilter !== 'all' || userFilter || dateFrom || dateTo) && (
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-800"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div>
            {paginatedRequests.map((request) => (
              <RequestCard key={request.request_id} request={request} />
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
