'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface Order {
  _id: string;
  items: any[];
  total: number;
  status: string;
  createdAt: string;
  trackingId?: string;
  deliveryAgent?: string;
}

interface Address {
  _id: string;
  name: string;
  type: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pinCode: string;
  mobile: string;
  country: string;
}

function AccountsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'addresses'>('profile');
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser(payload);
    } catch (error) {
      console.error('Invalid token', error);
      router.push('/login');
      return;
    }

    // Set active tab from URL params
    const tab = searchParams.get('tab');
    if (tab === 'orders' || tab === 'addresses') {
      setActiveTab(tab);
    }

    setLoading(false);
  }, [router, searchParams]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      if (activeTab === 'orders') {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch('/api/orders', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setOrders(data.orders);
          }
        } catch (error) {
          console.error('Error fetching orders:', error);
        }
      } else if (activeTab === 'addresses') {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch('/api/addresses', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setAddresses(data.addresses);
          }
        } catch (error) {
          console.error('Error fetching addresses:', error);
        }
      }
    };

    fetchData();
  }, [activeTab, user]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">User Profile</h2>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-600 font-medium">First Name</label>
                  <p className="mt-1 text-gray-900">{user.firstname}</p>
                </div>
                <div>
                  <label className="block text-gray-600 font-medium">Last Name</label>
                  <p className="mt-1 text-gray-900">{user.lastname}</p>
                </div>
                <div>
                  <label className="block text-gray-600 font-medium">Email</label>
                  <p className="mt-1 text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="block text-gray-600 font-medium">Username</label>
                  <p className="mt-1 text-gray-900">{user.username}</p>
                </div>
                <div>
                  <label className="block text-gray-600 font-medium">Gender</label>
                  <p className="mt-1 text-gray-900 capitalize">{user.gender}</p>
                </div>
                <div>
                  <label className="block text-gray-600 font-medium">Mobile</label>
                  <p className="mt-1 text-gray-900">{user.mobile}</p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'orders':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">My Orders</h2>
            <div className="space-y-4">
              {orders.length === 0 ? (
                <p className="text-gray-600">No orders found.</p>
              ) : (
                orders.map(order => (
                  <div
                    key={order._id}
                    onClick={() => router.push(`/order-review/${order._id}`)}
                    className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border border-gray-100"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Order ID: {order._id.slice(-8).toUpperCase()}</p>
                        <p className="text-sm text-gray-600">Date: {new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-lg">💰 ${order.total}</p>
                        <p className={`text-sm font-semibold ${
                          order.status === 'delivered' ? 'text-green-600' :
                          order.status === 'ordered' ? 'text-blue-600' :
                          order.status === 'order_approved' ? 'text-green-600' :
                          order.status === 'packed_in_transit' ? 'text-orange-600' :
                          'text-yellow-600'
                        }`}>
                          {order.status.replace('_', ' ').replace('order ', '').toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2 flex items-center">
                        📦 Items ({order.items.length})
                      </h4>
                      <ul className="list-disc list-inside text-sm text-gray-700 mb-3">
                        {order.items.slice(0, 3).map((item: any, index: number) => (
                          <li key={index}>{item.name} - Qty: {item.quantity}</li>
                        ))}
                        {order.items.length > 3 && (
                          <li className="text-gray-500">+{order.items.length - 3} more items...</li>
                        )}
                      </ul>
                      {order.trackingId && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm font-medium text-blue-800">🚚 Tracking Information:</p>
                          <p className="text-sm text-blue-700">ID: {order.trackingId}</p>
                          {order.deliveryAgent && <p className="text-sm text-blue-700">Agent: {order.deliveryAgent}</p>}
                        </div>
                      )}
                      <div className="mt-4 text-center">
                        <span className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                          Click to view details →
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      case 'addresses':
        return (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">My Addresses</h2>
              <button
                onClick={() => router.push('/accounts/add-address')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Address
              </button>
            </div>
            <div className="space-y-4">
              {addresses.length === 0 ? (
                <p className="text-gray-600">No addresses found.</p>
              ) : (
                addresses.map(address => (
                    <div key={address._id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium">{address.name}</p>
                        <p className="text-sm text-gray-500 capitalize">({address.type})</p>
                        <p className="text-gray-700 mt-1">
                          {address.addressLine1}<br />
                          {address.addressLine2}<br />
                          {address.city}, {address.state} {address.pinCode}<br />
                          {address.country}<br />
                          Mobile: {address.mobile}
                        </p>
                      </div>
                      <button
                        onClick={() => router.push(`/accounts/edit-address?id=${address._id}`)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="flex">
            {/* Left Pane */}
            <div className="w-1/4 bg-gray-50 border-r">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Account Settings</h3>
                <nav className="space-y-2">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`block w-full text-left px-4 py-2 rounded-md transition-colors ${
                      activeTab === 'profile' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    User Profile
                  </button>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className={`block w-full text-left px-4 py-2 rounded-md transition-colors ${
                      activeTab === 'orders' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    My Orders
                  </button>
                  <button
                    onClick={() => setActiveTab('addresses')}
                    className={`block w-full text-left px-4 py-2 rounded-md transition-colors ${
                      activeTab === 'addresses' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    Address
                  </button>
                </nav>
              </div>
            </div>
            {/* Body */}
            <div className="w-3/4">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AccountsPageContent />
    </Suspense>
  );
}