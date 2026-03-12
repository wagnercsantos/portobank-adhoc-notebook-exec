import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { Settings, UserPlus, Trash2, Shield, Users, AlertCircle, CheckCircle } from 'lucide-react';
import type { AdminUser, Approver } from '../types';

export default function Admin() {
  const { user } = useAppStore();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New user form
  const [newEmail, setNewEmail] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [addingTo, setAddingTo] = useState<'admin' | 'approver' | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [adminsRes, approversRes] = await Promise.all([
        fetch('/api/users/admins'),
        fetch('/api/users/approvers'),
      ]);

      if (!adminsRes.ok || !approversRes.ok) {
        throw new Error('Failed to fetch data. Make sure you have admin access.');
      }

      const adminsData = await adminsRes.json();
      const approversData = await approversRes.json();

      setAdmins(adminsData.admins || []);
      setApprovers(approversData.approvers || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddUser = async (type: 'admin' | 'approver') => {
    if (!newEmail.trim()) {
      setError('Email is required');
      return;
    }

    setAddingTo(type);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/users/${type}s`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail.trim(),
          display_name: newDisplayName.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || `Failed to add ${type}`);
      }

      setSuccess(`${type === 'admin' ? 'Admin' : 'Approver'} added successfully`);
      setNewEmail('');
      setNewDisplayName('');
      fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAddingTo(null);
    }
  };

  const handleRemoveAdmin = async (email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} as admin?`)) return;

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/users/admins/${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to remove admin');
      }

      setSuccess('Admin removed successfully');
      fetchData();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleRemoveApprover = async (email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} as approver?`)) return;

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/users/approvers/${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to remove approver');
      }

      setSuccess('Approver removed successfully');
      fetchData();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (!user?.is_admin) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Shield className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">Admin Access Required</h2>
        <p className="text-gray-500 mt-2">You need admin privileges to access this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold">Administration</h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Add User Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Add New User</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input
              type="text"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder="John Doe"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleAddUser('admin')}
            disabled={addingTo !== null}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            {addingTo === 'admin' ? 'Adding...' : 'Add as Admin'}
          </button>
          <button
            onClick={() => handleAddUser('approver')}
            disabled={addingTo !== null}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            {addingTo === 'approver' ? 'Adding...' : 'Add as Approver'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Admins Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold">Administrators ({admins.length})</h2>
          </div>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : admins.length === 0 ? (
            <p className="text-gray-500">No administrators found</p>
          ) : (
            <ul className="space-y-3">
              {admins.map((admin) => (
                <li key={admin.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{admin.display_name || admin.email}</p>
                    <p className="text-sm text-gray-500">{admin.email}</p>
                  </div>
                  {admin.email.toLowerCase() !== user.user_name.toLowerCase() && (
                    <button
                      onClick={() => handleRemoveAdmin(admin.email)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                      title="Remove admin"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Approvers Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold">Approvers ({approvers.length})</h2>
          </div>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : approvers.length === 0 ? (
            <p className="text-gray-500">No approvers found</p>
          ) : (
            <ul className="space-y-3">
              {approvers.map((approver) => (
                <li key={approver.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{approver.display_name || approver.email}</p>
                    <p className="text-sm text-gray-500">{approver.email}</p>
                    {!approver.is_active && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-gray-300 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveApprover(approver.email)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                    title="Remove approver"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
