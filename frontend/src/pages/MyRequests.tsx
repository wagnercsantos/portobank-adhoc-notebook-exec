import { useEffect } from 'react';
import { FileText, RefreshCw } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import RequestCard from '../components/RequestCard';

export default function MyRequests() {
  const { myRequests, fetchMyRequests, loading, error } = useAppStore();

  useEffect(() => {
    fetchMyRequests();
  }, [fetchMyRequests]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Requests</h1>
        <button
          onClick={() => fetchMyRequests()}
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

      {loading && myRequests.length === 0 ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading your requests...</p>
        </div>
      ) : myRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No requests yet</h3>
          <p className="text-gray-500">
            Submit your first notebook for approval to get started.
          </p>
        </div>
      ) : (
        <div>
          {myRequests.map((request) => (
            <RequestCard key={request.request_id} request={request} />
          ))}
        </div>
      )}
    </div>
  );
}
