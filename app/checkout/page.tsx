'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/CartContext';
import Modal from '@/components/Modal';

interface CartItem {
  _id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  categoryName?: string;
  subcategoryName?: string;
  filterValues?: { attributeId: string; valueId: string }[];
  stockQuantity: number;
  maxQuantityPerOrder: number;
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

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, cartTotal, clearCart } = useCart();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [invalidItems, setInvalidItems] = useState<string[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchAddresses = async () => {
      try {
        const res = await fetch('/api/addresses', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAddresses(data.addresses);
          // Auto-select first address if available
          if (data.addresses.length > 0) {
            setSelectedAddressId(data.addresses[0]._id);
          }
        }
      } catch (error) {
        console.error('Error fetching addresses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAddresses();
  }, [router]);

  const validateProducts = async () => {
    const invalid = [];
    for (const item of cart) {
      try {
        const res = await fetch(`/api/products/${item.productId}`);
        if (!res.ok) {
          invalid.push(item.name);
        } else {
          const product = await res.json();
          if (product.quantity < item.quantity) {
            invalid.push(`${item.name} (insufficient stock)`);
          }
        }
      } catch (error) {
        invalid.push(item.name);
      }
    }
    return invalid;
  };

  const handleProceedToBuy = async () => {
    if (!selectedAddressId) {
      setModalMessage('Please select a delivery address');
      setShowErrorModal(true);
      return;
    }

    // Validate products exist and have stock
    const invalid = await validateProducts();
    if (invalid.length > 0) {
      setModalMessage(`Some items are no longer available: ${invalid.join(', ')}. Please update your cart.`);
      setShowErrorModal(true);
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmPurchase = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const orderData = {
        items: cart.map(item => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image
        })),
        addressId: selectedAddressId,
        total: cartTotal
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      const data = await res.json();

      if (res.ok) {
        setModalMessage('Order placed successfully! You will be redirected to your orders.');
        setShowSuccessModal(true);
        // Clear cart after successful order
        if (clearCart) {
          await clearCart();
        }
        setTimeout(() => {
          router.push('/accounts?tab=orders');
        }, 2000);
      } else {
        setModalMessage(data.message || 'Failed to place order. Please try again.');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Error placing order:', error);
      setModalMessage('Failed to place order. Please try again.');
      setShowErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center py-8">
        <div className="bg-white p-8 rounded-lg shadow-2xl text-center">
          <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Cart Items */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            <div className="space-y-4">
              {cart.map((item: CartItem) => (
                <div key={item._id} className="flex items-center space-x-4 border-b pb-4">
                  {item.image ? (
                    <img
                      src={item.image.startsWith('/shopping/') ? `/api/images?path=${item.image}` : item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                      <span className="text-gray-400 text-xs">No Image</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="text-sm text-gray-600">
                      Quantity: {item.quantity} × ${item.price}
                    </p>
                    {item.categoryName && (
                      <p className="text-xs text-gray-500">{item.categoryName}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total:</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Address Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Delivery Address</h2>
            {addresses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No addresses found. Please add an address first.</p>
                <button
                  onClick={() => router.push('/accounts?tab=addresses')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Add Address
                </button>
              </div>
            ) : addresses.length === 1 ? (
              <div className="p-4 border rounded-lg bg-gray-50">
                <p className="font-medium">{addresses[0].name}</p>
                <p className="text-sm text-gray-600">
                  {addresses[0].addressLine1}<br />
                  {addresses[0].addressLine2}<br />
                  {addresses[0].city}, {addresses[0].state} {addresses[0].pinCode}<br />
                  {addresses[0].country}<br />
                  Mobile: {addresses[0].mobile}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <select
                  value={selectedAddressId}
                  onChange={(e) => setSelectedAddressId(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                >
                  <option value="">Select an address</option>
                  {addresses.map(address => (
                    <option key={address._id} value={address._id}>
                      {address.name} - {address.addressLine1}, {address.city}, {address.state} {address.pinCode}
                    </option>
                  ))}
                </select>
                {selectedAddressId && (
                  <div className="p-4 border rounded-lg bg-gray-50">
                    {(() => {
                      const selected = addresses.find(addr => addr._id === selectedAddressId);
                      return selected ? (
                        <>
                          <p className="font-medium">{selected.name}</p>
                          <p className="text-sm text-gray-600">
                            {selected.addressLine1}<br />
                            {selected.addressLine2}<br />
                            {selected.city}, {selected.state} {selected.pinCode}<br />
                            {selected.country}<br />
                            Mobile: {selected.mobile}
                          </p>
                        </>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleProceedToBuy}
              disabled={!selectedAddressId || isSubmitting}
              className="w-full mt-6 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {isSubmitting ? 'Processing...' : 'Proceed to Buy'}
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        message="Are you sure you want to purchase these items?"
        type="confirm"
        onOk={handleConfirmPurchase}
        onCancel={() => setShowConfirmModal(false)}
      />

      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message={modalMessage}
        type="success"
      />

      <Modal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        message={modalMessage}
        type="error"
      />
    </div>
  );
}