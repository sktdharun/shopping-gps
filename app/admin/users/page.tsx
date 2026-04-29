'use client';

import { useState, useEffect, useCallback } from 'react';

interface User {
  _id: string;
  username: string;
  email: string;
  firstname: string;
  lastname: string;
  role: string;
  status: string;
  createdAt: string;
}

interface Role {
  _id: string;
  name: string;
}

interface Status {
  _id: string;
  name: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 10, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if admin (simple check, in real app use context or middleware)
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && Date.now() / 1000 > payload.exp) {
          localStorage.removeItem('token');
          window.location.href = '/login';
          return;
        }
        setIsAdmin(payload.role === 'admin');
      } catch {
        setIsAdmin(false);
      }
    } else {
      setIsAdmin(false);
    }
  }, [token]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statusParam = activeTab === 'all' ? '' : activeTab;
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch(`/api/users?status=${statusParam}&page=${pagination.page}&limit=${pagination.limit}`, {
        headers,
      });
      if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, pagination.page, pagination.limit, token]);

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/roles');
      if (!res.ok) throw new Error('Failed to fetch roles');
      const data = await res.json();
      // Remove duplicates based on name
      const uniqueRoles = data.roles.filter((role: Role, index: number, self: Role[]) =>
        index === self.findIndex((r) => r.name === role.name)
      );
      setRoles(uniqueRoles);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStatuses = async () => {
    try {
      const res = await fetch('/api/statuses');
      if (!res.ok) throw new Error('Failed to fetch statuses');
      const data = await res.json();
      setStatuses(data.statuses);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchRoles();
      fetchStatuses();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [fetchUsers, isAdmin]);

  const handleUpdateUser = async (userId: string, updates: { statusId?: string; roleId?: string }) => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ userId, ...updates }),
      });
      if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }
      if (!res.ok) throw new Error('Failed to update user');
      fetchUsers(); // Refresh list
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const approveUser = (userId: string, roleId: string) => {
    const approvedStatus = statuses.find(s => s.name === 'approved');
    if (approvedStatus) {
      handleUpdateUser(userId, { statusId: approvedStatus._id, roleId });
    }
  };

  const rejectUser = (userId: string) => {
    const rejectedStatus = statuses.find(s => s.name === 'rejected');
    if (rejectedStatus) {
      handleUpdateUser(userId, { statusId: rejectedStatus._id });
    }
  };

  if (!isAdmin) {
    return <div>Access denied. Admin only.</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Admin User Management</h1>

      {/* Tabs */}
      <div className="flex space-x-4 mb-4">
        {['all', 'pending', 'approved', 'rejected'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded ${activeTab === tab ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && <div className="text-red-500 mb-4">{error}</div>}

      {/* Table */}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">Username</th>
                <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">Created At</th>
                {activeTab === 'pending' && <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user, index) => (
                <tr key={user._id} className={`hover:bg-gray-50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.firstname} {user.lastname}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.status === 'approved' ? 'bg-green-100 text-green-800' :
                      user.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                  {activeTab === 'pending' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <select
                        id={`role-${user._id}`}
                        className="mr-2 px-3 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        defaultValue={roles.find(r => r.name === user.role)?._id || ''}
                      >
                        {roles.map((role) => (
                          <option key={role._id} value={role._id}>{role.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          const select = document.getElementById(`role-${user._id}`) as HTMLSelectElement;
                          approveUser(user._id, select.value);
                        }}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => rejectUser(user._id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200"
                      >
                        Reject
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="mt-4 flex justify-between">
        <button
          onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
          disabled={pagination.page === 1}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span>Page {pagination.page} of {pagination.totalPages}</span>
        <button
          onClick={() => setPagination(p => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
          disabled={pagination.page === pagination.totalPages}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}