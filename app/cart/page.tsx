'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/CartContext';
import SessionExpiredModal from '../components/SessionExpiredModal';

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

interface FilterAttribute {
  _id: string;
  name: string;
  displayName: string;
  categoryId: string;
  type: string;
  unit?: string | null;
  isMultiSelect: boolean;
  sortOrder: number;
  isActive: boolean;
}

interface FilterValue {
  _id: string;
  attributeId: string;
  value: string;
  displayLabel: string;
  count: number;
  sortOrder: number;
  isActive: boolean;
}

interface ResolvedFilterValue {
  attributeName: string;
  attributeDisplayName: string;
  value: string;
  displayLabel: string;
  unit?: string | null;
  isColor: boolean;
  colorCode?: string;
}

export default function CartPage() {
  const router = useRouter();
  const { cart, cartTotal, refreshCart, removeFromCart, updateQuantity } = useCart();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAttributes, setFilterAttributes] = useState<FilterAttribute[]>([]);
  const [filterValues, setFilterValues] = useState<FilterValue[]>([]);
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      // Fetch filter attributes and values for display
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const [attrRes, valRes] = await Promise.all([
          fetch('/api/filter-attributes', { headers }),
          fetch('/api/filter-values', { headers })
        ]);

        if (!attrRes.ok && attrRes.status === 401) {
          const data = await attrRes.json();
          if (data.message === 'Token expired') {
            setShowSessionExpiredModal(true);
            return;
          }
        }
        if (!valRes.ok && valRes.status === 401) {
          const data = await valRes.json();
          if (data.message === 'Token expired') {
            setShowSessionExpiredModal(true);
            return;
          }
        }

        if (attrRes.ok) setFilterAttributes(await attrRes.json());
        if (valRes.ok) setFilterValues(await valRes.json());
      } catch (err) {
        console.error('Error fetching filter data:', err);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  // Resolve filter values for each cart item
  const resolvedCartItems = useMemo(() => {
    return cart.map(item => {
      if (!item.filterValues || !filterAttributes.length || !filterValues.length) {
        return { ...item, resolvedFilterValues: [] as ResolvedFilterValue[] };
      }

      const resolved = item.filterValues
        .filter(fv => fv.attributeId && fv.valueId)
        .map(fv => {
          const attribute = filterAttributes.find(attr => attr._id === fv.attributeId);
          const value = filterValues.find(val => val._id === fv.valueId);
          if (!attribute || !value) return null;

          const isColor = attribute.name.toLowerCase() === 'color' || attribute.displayName.toLowerCase().includes('color');
          const colorCode = isColor ? getColorCode(value.value) : undefined;

          return {
            attributeName: attribute.name,
            attributeDisplayName: attribute.displayName,
            value: value.value,
            displayLabel: value.displayLabel,
            unit: attribute.unit,
            isColor,
            colorCode
          } as ResolvedFilterValue;
        })
        .filter((v): v is ResolvedFilterValue => v !== null);

      return { ...item, resolvedFilterValues: resolved };
    });
  }, [cart, filterAttributes, filterValues]);

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    await updateQuantity(itemId, newQuantity);
  };

  const handleRemove = async (itemId: string) => {
    await removeFromCart(itemId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Continue Shopping
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
          <div className="w-40"></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {cart.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-6">Looks like you haven't added anything to your cart yet.</p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {resolvedCartItems.map((item) => (
                <div key={item._id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex gap-6">
                    {/* Product Image */}
                    <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {item.image ? (
                        <img
                          src={item.image.startsWith('/shopping/') ? `/api/images?path=${item.image}` : item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {item.name}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {item.categoryName}
                            {item.subcategoryName && ` • ${item.subcategoryName}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">${item.price}</p>
                          <p className={`text-sm ${item.stockQuantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {item.stockQuantity > 0 ? 'In Stock' : 'Out of Stock'}
                          </p>
                        </div>
                      </div>

                      {/* Filter Values if any */}
                      {item.resolvedFilterValues && item.resolvedFilterValues.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {item.resolvedFilterValues.map((fv, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs border border-gray-200"
                            >
                              {fv.isColor && fv.colorCode && (
                                <div
                                  className="w-3 h-3 rounded-full border border-gray-300 mr-1.5"
                                  style={{ backgroundColor: fv.colorCode }}
                                />
                              )}
                              {fv.displayLabel}
                              {fv.unit && ` ${fv.unit}`}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-end mt-4 space-x-3">
                        <div className="flex items-center border border-gray-300 rounded-lg">
                          <button
                            onClick={() => handleQuantityChange(item._id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="px-3 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            −
                          </button>
                          <span className="px-4 py-1 text-gray-900 font-medium">{item.quantity}</span>
                          <button
                            onClick={() => handleQuantityChange(item._id, item.quantity + 1)}
                            disabled={item.quantity >= Math.min(item.stockQuantity, item.maxQuantityPerOrder)}
                            className="px-3 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => handleRemove(item._id)}
                          className="text-red-600 hover:text-red-800 font-medium text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span>{cartTotal >= 50 ? 'Free' : '$5.99'}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between text-lg font-bold text-gray-900">
                      <span>Total</span>
                      <span>${(cartTotal >= 50 ? cartTotal : cartTotal + 5.99).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <button
                  disabled={cart.length === 0}
                  onClick={() => router.push('/checkout')}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                    cart.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
                  }`}
                >
                  Proceed to Checkout
                </button>

                <p className="text-xs text-gray-500 text-center mt-4">
                  Free shipping on orders over $50
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <SessionExpiredModal
        isOpen={showSessionExpiredModal}
        onClose={() => setShowSessionExpiredModal(false)}
      />
    </div>
  );
}

// Helper function for color swatches
function getColorCode(colorValue: string): string {
  const colorMap: Record<string, string> = {
    black: '#000000',
    white: '#FFFFFF',
    red: '#DC2626',
    blue: '#2563EB',
    navy: '#001F3F',
    grey: '#6B7280',
    gray: '#6B7280',
    green: '#16A34A',
    yellow: '#EAB308',
    orange: '#F97316',
    purple: '#9333EA',
    pink: '#EC4899',
    brown: '#92400E',
    beige: '#F5F5DC',
    cream: '#FFFDD0',
    silver: '#C0C0C0',
    gold: '#FFD700',
    teal: '#14B8A6',
    cyan: '#06B6D4',
    maroon: '#800000',
    olive: '#808000',
    lime: '#32CD32',
    aqua: '#00FFFF',
    sky: '#87CEEB',
    lavender: '#E6E6FA',
    rose: '#FF007F',
    burgundy: '#800020',
    mint: '#3EB489',
    coral: '#FF7F50',
    salmon: '#FA8072'
  };

  const normalized = colorValue.toLowerCase().trim();
  return colorMap[normalized] || '#CCCCCC';
}
