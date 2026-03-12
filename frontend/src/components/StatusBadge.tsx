import {
  Clock,
  CheckCircle,
  XCircle,
  Play,
  AlertCircle,
} from 'lucide-react';

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    pending: {
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-800',
      label: 'Pending',
    },
    approved: {
      icon: CheckCircle,
      color: 'bg-green-100 text-green-800',
      label: 'Approved',
    },
    rejected: {
      icon: XCircle,
      color: 'bg-red-100 text-red-800',
      label: 'Rejected',
    },
    executed: {
      icon: Play,
      color: 'bg-blue-100 text-blue-800',
      label: 'Executed',
    },
    failed: {
      icon: AlertCircle,
      color: 'bg-red-100 text-red-800',
      label: 'Failed',
    },
  }[status] || {
    icon: Clock,
    color: 'bg-gray-100 text-gray-800',
    label: status,
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}
