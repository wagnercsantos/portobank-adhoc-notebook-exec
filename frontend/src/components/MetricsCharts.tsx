import { useMemo } from 'react';
import { TrendingUp, PieChart, BarChart3 } from 'lucide-react';
import type { AuditStats } from '../types';

interface MetricsChartsProps {
  stats: AuditStats | null;
}

export default function MetricsCharts({ stats }: MetricsChartsProps) {
  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        Loading metrics...
      </div>
    );
  }

  const statusData = useMemo(
    () => [
      { label: 'Pending', value: stats.pending, color: '#F59E0B' },
      { label: 'Approved', value: stats.approved, color: '#10B981' },
      { label: 'Rejected', value: stats.rejected, color: '#EF4444' },
      { label: 'Executed', value: stats.executed, color: '#3B82F6' },
      { label: 'Failed', value: stats.failed, color: '#DC2626' },
    ],
    [stats]
  );

  const total = stats.total_requests || 1;

  // Calculate success rate
  const successRate = stats.total_requests > 0
    ? Math.round(((stats.executed + stats.approved) / stats.total_requests) * 100)
    : 0;

  // Calculate approval rate
  const approvalRate = (stats.approved + stats.rejected + stats.executed + stats.failed) > 0
    ? Math.round(
        ((stats.approved + stats.executed) /
          (stats.approved + stats.rejected + stats.executed + stats.failed)) *
          100
      )
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Requests</p>
              <p className="text-3xl font-bold mt-1">{stats.total_requests}</p>
            </div>
            <BarChart3 className="w-10 h-10 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Approval Rate</p>
              <p className="text-3xl font-bold mt-1">{approvalRate}%</p>
            </div>
            <TrendingUp className="w-10 h-10 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Success Rate</p>
              <p className="text-3xl font-bold mt-1">{successRate}%</p>
            </div>
            <PieChart className="w-10 h-10 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Status Distribution</h3>

        {/* Bar Chart Visualization */}
        <div className="space-y-4">
          {statusData.map((item) => {
            const percentage = Math.round((item.value / total) * 100);
            return (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-medium">
                    {item.value} ({percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      {stats.recent_activity && stats.recent_activity.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity (Last 7 Days)</h3>

          <div className="flex items-end gap-2 h-40">
            {stats.recent_activity.map((day, index) => {
              const maxCount = Math.max(...stats.recent_activity.map((d) => d.count), 1);
              const height = Math.max((day.count / maxCount) * 100, 5);

              return (
                <div
                  key={index}
                  className="flex-1 flex flex-col items-center"
                >
                  <div
                    className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                    style={{ height: `${height}%` }}
                    title={`${day.count} requests`}
                  />
                  <span className="text-xs text-gray-500 mt-2">
                    {new Date(day.date).toLocaleDateString('pt-BR', {
                      weekday: 'short',
                    })}
                  </span>
                  <span className="text-xs font-medium text-gray-700">
                    {day.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total" value={stats.total_requests} color="bg-gray-100" />
        <StatCard label="Pending" value={stats.pending} color="bg-yellow-100" textColor="text-yellow-800" />
        <StatCard label="Approved" value={stats.approved} color="bg-green-100" textColor="text-green-800" />
        <StatCard label="Rejected" value={stats.rejected} color="bg-red-100" textColor="text-red-800" />
        <StatCard label="Executed" value={stats.executed} color="bg-blue-100" textColor="text-blue-800" />
        <StatCard label="Failed" value={stats.failed} color="bg-red-100" textColor="text-red-800" />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  textColor = 'text-gray-800',
}: {
  label: string;
  value: number;
  color: string;
  textColor?: string;
}) {
  return (
    <div className={`${color} rounded-lg p-4 text-center`}>
      <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
}
