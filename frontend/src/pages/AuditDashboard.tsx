import { useEffect, useState } from 'react';
import { BarChart3, RefreshCw, Filter } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import RequestCard from '../components/RequestCard';

export default function AuditDashboard() {
  const {
    allRequests,
    auditStats,
    fetchAllRequests,
    fetchAuditStats,
    loading,
    error,
  } = useAppStore();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchAllRequests();
    fetchAuditStats();
  }, [fetchAllRequests, fetchAuditStats]);

  const filteredRequests =
    statusFilter === 'all'
      ? allRequests
      : allRequests.filter((r) => r.status === statusFilter);

  const statCards = [
    { label: 'Total Requests', value: auditStats?.total_requests || 0, color: 'bg-gray-100' },
    { label: 'Pending', value: auditStats?.pending || 0, color: 'bg-yellow-100' },
    { label: 'Approved', value: auditStats?.approved || 0, color: 'bg-green-100' },
    { label: 'Rejected', value: auditStats?.rejected || 0, color: 'bg-red-100' },
    { label: 'Executed', value: auditStats?.executed || 0, color: 'bg-blue-100' },
    { label: 'Failed', value: auditStats?.failed || 0, color: 'bg-red-100' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Audit Dashboard</h1>
          <p className="text-gray-500">
            Complete history of all notebook execution requests
          </p>
        </div>
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

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className={`${stat.color} rounded-lg p-4 text-center`}
          >
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-gray-600">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4 mb-6">
        <Filter className="w-5 h-5 text-gray-500" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="executed">Executed</option>
          <option value="failed">Failed</option>
        </select>
        <span className="text-gray-500">
          Showing {filteredRequests.length} requests
        </span>
      </div>

      {/* Request List */}
      {loading && allRequests.length === 0 ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading audit data...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No requests found
          </h3>
          <p className="text-gray-500">
            {statusFilter === 'all'
              ? 'No notebook execution requests have been made yet.'
              : `No requests with status "${statusFilter}".`}
          </p>
        </div>
      ) : (
        <div>
          {filteredRequests.map((request) => (
            <RequestCard key={request.request_id} request={request} />
          ))}
        </div>
      )}
    </div>
  );
}
