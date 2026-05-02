'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface User {
  userId: string;
  role: string;
}

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  attributes: any[];
}

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  product: Product | null;
}

interface Order {
  _id: string;
  items: OrderItem[];
  total: number;
  status: string;
  statusDisplay?: string;
  createdAt: string;
  trackingId?: string;
  deliveryAgent?: string;
  user?: {
    name: string;
    email: string;
    mobile: string;
  };
  address?: {
    name: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pinCode: string;
    mobile: string;
  };
}

export default function OrderReviewPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [trackingId, setTrackingId] = useState<string>('');
  const [deliveryAgent, setDeliveryAgent] = useState<string>('');
  const [statusUpdateMessage, setStatusUpdateMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        // Decode token to get user info
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUser({ userId: payload._id, role: payload.role });
        } catch (tokenError) {
          console.error('Invalid token:', tokenError);
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }

        const response = await fetch(`/api/orders/${params.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          if (response.status === 404) {
            setError('Order not found');
          } else if (response.status === 403) {
            setError('Access denied');
          } else {
            setError('Failed to load order details');
          }
          return;
        }

        const data = await response.json();
        setOrder(data.order);
      } catch (err) {
        setError('An error occurred while loading the order');
        console.error('Error fetching order:', err);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchOrderDetails();
    }
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Oops!</h1>
          <p className="text-gray-600 mb-6">{error || 'Order not found'}</p>
          <button
            onClick={() => router.back()}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-full hover:shadow-lg transition-all duration-300"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (statusDisplay: string) => {
    switch (statusDisplay.toLowerCase()) {
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in transit':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'approved':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ordered':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'packaged':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'received':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (statusDisplay: string) => {
    switch (statusDisplay.toLowerCase()) {
      case 'delivered':
        return '✅';
      case 'in transit':
        return '🚚';
      case 'approved':
        return '📦';
      case 'ordered':
        return '🛒';
      case 'received':
        return '📦';
      case 'packaged':
        return '📦';
      case 'rejected':
        return '❌';
      default:
        return '📋';
    }
  };

  const getAvailableStatuses = (currentStatusDisplay: string, userRole: string): string[] => {
    const transitions = {
      admin: {
        'Ordered': ['approved', 'rejected', 'packaged', 'InTransit'],
        'Approved': ['packaged', 'InTransit'],
        'Packaged': ['InTransit'],
        'In Transit': ['delivered'],
        'Received': ['delivered'],
        'Rejected': [], // Terminal state
        'Delivered': [] // Terminal state
      },
      user: {
        'Ordered': [], // User can't change from ordered
        'Approved': [], // User can't change from approved
        'Packaged': [], // User can't change from packaged
        'In Transit': ['received'],
        'Received': [], // User can't change from received
        'Rejected': [], // Terminal state
        'Delivered': [] // Terminal state
      }
    };

    return transitions[userRole as keyof typeof transitions]?.[currentStatusDisplay as keyof typeof transitions.admin] || [];
  };

  const handleStatusUpdate = async () => {
    if (!selectedStatus || !order) return;

    try {
      setUpdatingStatus(true);
      setStatusUpdateMessage(null);

      const token = localStorage.getItem('token');
      const updateData: any = { newStatus: selectedStatus };

      if (selectedStatus === 'InTransit') {
        if (!trackingId.trim()) {
          setStatusUpdateMessage('Tracking ID is required for InTransit status');
          return;
        }
        updateData.trackingId = trackingId.trim();
        if (deliveryAgent.trim()) {
          updateData.deliveryAgent = deliveryAgent.trim();
        }
      }

      const response = await fetch(`/api/orders/${order._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        setStatusUpdateMessage(errorData.message || 'Failed to update status');
        return;
      }

      const result = await response.json();
      setOrder(result.order);
      setShowStatusUpdate(false);
      setSelectedStatus('');
      setTrackingId('');
      setDeliveryAgent('');
      setStatusUpdateMessage('Status updated successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => setStatusUpdateMessage(null), 3000);
    } catch (err) {
      setStatusUpdateMessage('An error occurred while updating status');
      console.error('Error updating status:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-2">
            📋 Order Review
          </h1>
          <p className="text-gray-600">Detailed view of your order</p>
        </div>

        {/* Order Info and Status Flex */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Order Info Card */}
          <div className="lg:basis-[68%] lg:flex-shrink-0 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between text-white">
              <div>
                <h2 className="text-2xl font-bold mb-2">Order #{order._id.slice(-8).toUpperCase()}</h2>
                <p className="text-blue-100">Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>
              <div className="mt-4 md:mt-0 text-right">
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(order.status)}`}>
                  <span className="mr-2">{getStatusIcon(order.status)}</span>
                  {order.statusDisplay || order.status}
                </div>
                <div className="text-3xl font-bold mt-2 text-yellow-300">
                  ₹{order.total.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Customer & Address Info */}
          <div className="p-6 border-b border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <span className="mr-2">👤</span> Customer Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  {order.user ? (
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="font-medium text-gray-600">Name:</span> {order.user.name}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium text-gray-600">Email:</span> {order.user.email}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium text-gray-600">Mobile:</span> {order.user.mobile}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Customer information not available</p>
                  )}
                </div>
              </div>

              {/* Delivery Address */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <span className="mr-2">📍</span> Delivery Address
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  {order.address ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-800">{order.address.name}</p>
                      <p className="text-sm text-gray-600">
                        {order.address.addressLine1}<br />
                        {order.address.addressLine2 && <>{order.address.addressLine2}<br /></>}
                        {order.address.city}, {order.address.state} {order.address.pinCode}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium text-gray-600">Mobile:</span> {order.address.mobile}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Delivery address not available</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tracking Info */}
          {order.trackingId && (
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <span className="mr-2">🚚</span> Tracking Information
              </h3>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm">
                      <span className="font-medium text-gray-600">Tracking ID:</span> {order.trackingId}
                    </p>
                  </div>
                  {order.deliveryAgent && (
                    <div>
                      <p className="text-sm">
                        <span className="font-medium text-gray-600">Delivery Agent:</span> {order.deliveryAgent}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Order Items */}
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">📦</span> Order Items ({order.items.length})
            </h3>
            <div className="space-y-6">
              {order.items.map((item, index) => (
                <div key={index} className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
                  <div className="flex flex-col md:flex-row md:items-center gap-6">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-24 h-24 object-cover rounded-lg shadow-sm"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                          <span className="text-gray-400 text-2xl">📦</span>
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-grow">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                        <div className="flex-grow">
                          <h4 className="text-lg font-semibold text-gray-800 mb-2">{item.name}</h4>
                          {item.product?.category && (
                            <p className="text-sm text-blue-600 font-medium mb-2">📂 {item.product.category}</p>
                          )}
                          {item.product?.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.product.description}</p>
                          )}

                          {/* Attributes */}
                          {item.product?.attributes && item.product.attributes.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {item.product.attributes.map((attr: any, attrIndex: number) => (
                                <span key={attrIndex} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {attr.attributeName}: {attr.value}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Price & Quantity */}
                        <div className="mt-4 md:mt-0 md:text-right">
                          <div className="text-2xl font-bold text-green-600 mb-1">
                            ₹{item.price.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-600">
                            Quantity: <span className="font-semibold">{item.quantity}</span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Subtotal: <span className="font-semibold text-green-600">₹{(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Total */}
            <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xl font-bold text-gray-800">Order Total</h4>
                  <p className="text-sm text-gray-600">Including all taxes and charges</p>
                </div>
               <div className="text-right">
                 <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(order.statusDisplay || order.status)}`}>
                   <span className="mr-2">{getStatusIcon(order.statusDisplay || order.status)}</span>
                   {order.statusDisplay || order.status}
                 </div>
                </div>
              </div>
            </div>
          </div>
          </div>

          {/* Status Update Section */}
          {user && order && order.statusDisplay !== 'Delivered' && order.statusDisplay !== 'Rejected' && getAvailableStatuses(order.statusDisplay || order.status, user.role).length > 0 && (
            <div className="lg:basis-[32%] lg:flex-shrink-0 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
              <h3 className="text-xl font-bold text-white flex items-center">
                <span className="mr-2">⚙️</span> Order Status Management
              </h3>
              <p className="text-blue-100 mt-1">Update order status and manage workflow</p>
            </div>

            <div className="p-6">
              {!showStatusUpdate ? (
                <div className="text-center">
                  <button
                    onClick={() => setShowStatusUpdate(true)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-full hover:shadow-lg transition-all duration-300 hover:scale-105"
                  >
                    Update Order Status
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Status
                    </label>
                     <select
                       value={selectedStatus}
                       onChange={(e) => setSelectedStatus(e.target.value)}
                       className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     >
                       <option value="">Select new status</option>
                       {getAvailableStatuses(order.statusDisplay || order.status, user.role).map(status => (
                         <option key={status} value={status}>
                           {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                         </option>
                       ))}
                     </select>
                  </div>

                  {selectedStatus === 'InTransit' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tracking ID *
                        </label>
                        <input
                          type="text"
                          value={trackingId}
                          onChange={(e) => setTrackingId(e.target.value)}
                          placeholder="Enter tracking ID"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Delivery Agent (Optional)
                        </label>
                        <input
                          type="text"
                          value={deliveryAgent}
                          onChange={(e) => setDeliveryAgent(e.target.value)}
                          placeholder="Enter delivery agent name"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}

                  {statusUpdateMessage && (
                    <div className={`p-4 rounded-lg ${
                      statusUpdateMessage.includes('successfully')
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                      {statusUpdateMessage}
                    </div>
                  )}

                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => {
                        setShowStatusUpdate(false);
                        setSelectedStatus('');
                        setTrackingId('');
                        setDeliveryAgent('');
                        setStatusUpdateMessage(null);
                      }}
                      className="bg-gray-500 text-white px-6 py-3 rounded-full hover:bg-gray-600 transition-colors"
                      disabled={updatingStatus}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleStatusUpdate}
                      disabled={!selectedStatus || updatingStatus || (selectedStatus === 'InTransit' && !trackingId.trim())}
                      className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-full hover:shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updatingStatus ? 'Updating...' : 'Update Status'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        </div>

        {/* Back Button */}
        <div className="text-center">
          <button
            onClick={() => router.back()}
            className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-8 py-3 rounded-full hover:shadow-lg transition-all duration-300 hover:scale-105"
          >
            ← Back to Orders
          </button>
        </div>
      </div>
    </div>
  );
}