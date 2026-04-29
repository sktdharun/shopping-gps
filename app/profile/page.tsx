'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  username: string;
  role: string;
  statusId: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser(payload);
      } catch {
        console.error('Invalid token');
        localStorage.removeItem('token');
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-32"></div>
          <div className="relative px-6 pb-6">
            <div className="flex items-center">
              <div className="relative -mt-16">
                <div className="w-32 h-32 bg-white rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                  <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              </div>
              <div className="ml-6 mt-4">
                <h1 className="text-3xl font-bold text-gray-900">
                  {user.firstname} {user.lastname}
                </h1>
                <p className="text-gray-600 text-lg">@{user.username}</p>
                <div className="mt-2">
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                    user.role === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role === 'admin' ? 'Administrator' : 'User'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-teal-500 px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 7V9C15 10.7 13.7 12 12 12C10.3 12 9 10.7 9 9V7H3V9C3 13.1 6.1 16.4 10 16.9V19H8V21H10V23H14V21H16V19H14V16.9C17.9 16.4 21 13.1 21 9Z"/>
                </svg>
                Personal Information
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <div className="bg-gray-50 px-3 py-2 rounded-md text-gray-900">{user.firstname}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <div className="bg-gray-50 px-3 py-2 rounded-md text-gray-900">{user.lastname}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <div className="bg-gray-50 px-3 py-2 rounded-md text-gray-900">{user.username}</div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                Contact Information
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="bg-gray-50 px-3 py-2 rounded-md text-gray-900">{user.email}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Status</label>
                <div className="bg-gray-50 px-3 py-2 rounded-md text-gray-900">
                  <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Overview */}
        <div className="mt-6 bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              Account Overview
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">{user.role === 'admin' ? 'Admin' : 'User'}</div>
                  <div className="text-sm text-gray-600">Account Type</div>
                </div>
              </div>
              <div className="text-center">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">Active</div>
                  <div className="text-sm text-gray-600">Status</div>
                </div>
              </div>
              <div className="text-center">
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-600">Verified</div>
                  <div className="text-sm text-gray-600">Email</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.back()}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
          >
            ← Back to Shopping
          </button>
        </div>
      </div>
    </div>
  );
}