import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';
import {
  FileText,
  Send,
  ClipboardList,
  CheckSquare,
  BarChart3,
  User,
  Settings,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user } = useAppStore();

  const navItems = [
    { path: '/submit', label: 'Submit Request', icon: Send },
    { path: '/my-requests', label: 'My Requests', icon: FileText },
  ];

  if (user?.is_approver) {
    navItems.push(
      { path: '/pending', label: 'Pending Approvals', icon: CheckSquare },
      { path: '/audit', label: 'Audit Dashboard', icon: BarChart3 }
    );
  }

  if (user?.is_admin) {
    navItems.push({ path: '/admin', label: 'Administration', icon: Settings });
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <nav className="w-64 bg-gray-900 text-white p-4 flex flex-col h-screen sticky top-0">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="w-8 h-8 text-blue-400" />
            <h1 className="text-xl font-bold">Notebook Approval</h1>
          </div>
          <p className="text-gray-400 text-sm">Production Access Control</p>
        </div>

        <ul className="space-y-2 flex-1 overflow-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {user && (
          <div className="mt-auto pt-4 border-t border-gray-700">
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-800 rounded-lg">
              <User className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div className="overflow-hidden min-w-0">
                <p className="text-sm font-medium truncate">{user.display_name}</p>
                <p className="text-xs text-gray-400 truncate">{user.user_name}</p>
                <div className="flex gap-1 flex-wrap">
                  {user.is_admin && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-purple-600 rounded">
                      Admin
                    </span>
                  )}
                  {user.is_approver && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-green-600 rounded">
                      Approver
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
