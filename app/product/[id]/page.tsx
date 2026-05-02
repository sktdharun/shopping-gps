'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useCart } from '@/lib/CartContext';
import SessionExpiredModal from '../../components/SessionExpiredModal';

interface Category {
  _id: string;
  name: string;
  parentId?: string;
  level: number;
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

interface Stock {
  _id: string;
  name: string;
  price: number;
  description: string;
  categoryId: string;
  subcategoryId?: string;
  subSubcategoryId?: string;
  images: string[];
  quantity: number;
  maxQuantityPerOrder: number;
  isActive: boolean;
  filterValues?: { attributeId: string; valueId: string }[];
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

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const stockId = params.id as string;
  const { addToCart, cart } = useCart();

  const [stock, setStock] = useState<Stock | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterAttributes, setFilterAttributes] = useState<FilterAttribute[]>([]);
  const [filterValues, setFilterValues] = useState<FilterValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedMessage, setAddedMessage] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
  // Calculate remaining quantity that can be added to cart
  const remainingQuantity = useMemo(() => {
    if (!stock) return 0;

    const existingCartItem = cart.find(item => item.productId === stockId);
    const currentCartQuantity = existingCartItem ? existingCartItem.quantity : 0;
    const maxAllowedTotal = stock.maxQuantityPerOrder || 10;
    const availableStock = Math.max(0, stock.quantity - currentCartQuantity);
    const remainingAllowed = Math.max(0, maxAllowedTotal - currentCartQuantity);

    return Math.min(availableStock, remainingAllowed);
  }, [stock, cart, stockId]);

  const [quantity, setQuantity] = useState(1);

  const handleQuantityChange = (newQuantity: number) => {
    const constrainedQuantity = Math.max(1, Math.min(newQuantity, remainingQuantity));
    setQuantity(constrainedQuantity);
  };

  // Ensure quantity is valid when remaining quantity changes
  const validQuantity = Math.min(quantity, remainingQuantity);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const [stockRes, catRes, attrRes, valRes] = await Promise.all([
          fetch(`/api/stocks/${stockId}`, { headers }),
          fetch('/api/categories', { headers }),
          fetch('/api/filter-attributes', { headers }),
          fetch('/api/filter-values', { headers })
        ]);

        if (!stockRes.ok) {
          if (stockRes.status === 404) {
            throw new Error('Product not found');
          }
          if (stockRes.status === 401) {
            const data = await stockRes.json();
            if (data.message === 'Token expired') {
              setShowSessionExpiredModal(true);
              return;
            }
          }
          throw new Error('Failed to fetch product');
        }
        if (!catRes.ok) {
          if (catRes.status === 401) {
            const data = await catRes.json();
            if (data.message === 'Token expired') {
              setShowSessionExpiredModal(true);
              return;
            }
          }
          throw new Error('Failed to fetch categories');
        }
        if (!attrRes.ok) {
          if (attrRes.status === 401) {
            const data = await attrRes.json();
            if (data.message === 'Token expired') {
              setShowSessionExpiredModal(true);
              return;
            }
          }
          throw new Error('Failed to fetch filter attributes');
        }
        if (!valRes.ok) {
          if (valRes.status === 401) {
            const data = await valRes.json();
            if (data.message === 'Token expired') {
              setShowSessionExpiredModal(true);
              return;
            }
          }
          throw new Error('Failed to fetch filter values');
        }

        const [stockData, categoriesData, attributesData, valuesData] = await Promise.all([
          stockRes.json(),
          catRes.json(),
          attrRes.json(),
          valRes.json()
        ]);

        setStock(stockData);
        setCategories(categoriesData);
        setFilterAttributes(attributesData);
        setFilterValues(valuesData);
        setQuantity(1); // Reset quantity when loading a new product
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (stockId) {
      fetchData();
    }
  }, [stockId]);

  // Check user authentication status
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser(payload);
        setIsAdmin(payload.role === 'admin');
      } catch (error) {
        console.error('Invalid token', error);
        setUser(null);
        setIsAdmin(false);
      }
    } else {
      setUser(null);
      setIsAdmin(false);
    }
  }, []);

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return '';
    const category = categories.find(c => c._id === categoryId);
    return category?.name || '';
  };

  // Map color names to CSS hex codes
  const getColorCode = (colorValue: string): string => {
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
  };

  // Resolve filter values for display
  const resolvedFilterValues = useMemo((): ResolvedFilterValue[] => {
    if (!stock?.filterValues || !filterAttributes.length || !filterValues.length) return [];

    const result: ResolvedFilterValue[] = [];
    for (const fv of stock.filterValues) {
      if (!fv.attributeId || !fv.valueId) continue;
      const attribute = filterAttributes.find(attr => attr._id === fv.attributeId);
      const value = filterValues.find(val => val._id === fv.valueId);
      if (!attribute || !value) continue;

      // Check if this is a color attribute
      const isColor = attribute.name.toLowerCase() === 'color' || attribute.displayName.toLowerCase().includes('color');
      const colorCode = isColor ? getColorCode(value.value) : undefined;

      result.push({
        attributeName: attribute.name,
        attributeDisplayName: attribute.displayName,
        value: value.value,
        displayLabel: value.displayLabel,
        unit: attribute.unit,
        isColor,
        colorCode
      });
    }
    return result;
  }, [stock, filterAttributes, filterValues]);

  const handleBack = () => {
    router.back();
  };



  if (!stockId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Invalid product ID</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={handleBack}
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Shop
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-red-500 text-lg mb-2">{error}</div>
            <button
              onClick={handleBack}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Return to Shop
            </button>
          </div>
        </div>
      )}

      {/* Product Details */}
      {!loading && !error && stock && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              {/* Image Gallery */}
              <div className="bg-gray-100 p-8">
                <div className="aspect-square rounded-lg overflow-hidden bg-white mb-4">
                  {stock.images.length > 0 ? (
                    <img
                      src={stock.images[selectedImageIndex].startsWith('/shopping/') ?
                        `/api/images?path=${stock.images[selectedImageIndex]}` :
                        stock.images[selectedImageIndex]}
                      alt={`${stock.name} - Image ${selectedImageIndex + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No image available
                    </div>
                  )}
                </div>

                {stock.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {stock.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          selectedImageIndex === index
                            ? 'border-blue-600 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={image.startsWith('/shopping/') ?
                            `/api/images?path=${image}` : image}
                          alt={`${stock.name} thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-8 lg:p-12">
                <div className="mb-4">
                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <span>{getCategoryName(stock.categoryId)}</span>
                    {stock.subcategoryId && (
                      <>
                        <span className="mx-2">•</span>
                        <span>{getCategoryName(stock.subcategoryId)}</span>
                      </>
                    )}
                    {stock.subSubcategoryId && (
                      <>
                        <span className="mx-2">•</span>
                        <span>{getCategoryName(stock.subSubcategoryId)}</span>
                      </>
                    )}
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    {stock.name}
                  </h1>
                  <div className="flex items-center mb-6">
                    <span className="text-4xl font-bold text-gray-900">
                      ₹{stock.price}
                    </span>
                    <span className={`ml-4 px-3 py-1 rounded-full text-sm font-medium ${
                      stock.quantity > 10
                        ? 'bg-green-100 text-green-800'
                        : stock.quantity > 0
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {stock.quantity > 10
                        ? 'In Stock'
                        : stock.quantity > 0
                        ? 'Low Stock'
                        : 'Out of Stock'}
                    </span>
                  </div>
                </div>

                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
                  <p className="text-gray-600 leading-relaxed">
                    {stock.description || 'No description available.'}
                  </p>
                </div>

                {/* Filter Values Section */}
                {resolvedFilterValues.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">Specifications</h2>
                    <div className="space-y-4">
                      {resolvedFilterValues.map((fv, index) => (
                        <div key={index}>
                          <h3 className="text-sm font-medium text-gray-500 mb-2">
                            {fv.attributeDisplayName}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {fv.isColor && fv.colorCode ? (
                              // Color swatch display
                              <div
                                className="inline-flex items-center px-3 py-2 rounded-md border border-gray-200"
                                title={fv.displayLabel}
                              >
                                <div
                                  className="w-5 h-5 rounded-full border border-gray-300 mr-2"
                                  style={{ backgroundColor: fv.colorCode }}
                                />
                                <span className="text-gray-900">{fv.displayLabel}</span>
                              </div>
                            ) : (
                              // Standard badge display
                              <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm font-medium border border-gray-200">
                                {fv.displayLabel}
                                {fv.unit && ` ${fv.unit}`}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Product Details</h2>
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm text-gray-500">SKU</dt>
                      <dd className="text-sm font-medium text-gray-900">{stock._id.slice(-8).toUpperCase()}</dd>
                    </div>
                    {stock.categoryId && (
                      <div>
                        <dt className="text-sm text-gray-500">Category</dt>
                        <dd className="text-sm font-medium text-gray-900">{getCategoryName(stock.categoryId)}</dd>
                      </div>
                    )}
                    {stock.subcategoryId && (
                      <div>
                        <dt className="text-sm text-gray-500">Subcategory</dt>
                        <dd className="text-sm font-medium text-gray-900">{getCategoryName(stock.subcategoryId)}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Quantity Controls */}
                {!isAdmin && remainingQuantity > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Select Quantity</h3>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center border border-gray-300 rounded-lg">
                        <button
                          onClick={() => handleQuantityChange(validQuantity - 1)}
                          disabled={validQuantity <= 1}
                          className="px-3 py-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="px-4 py-2 text-gray-900 font-medium min-w-[3rem] text-center">
                          {validQuantity}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(validQuantity + 1)}
                          disabled={validQuantity >= remainingQuantity}
                          className="px-3 py-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm text-gray-500">
                        {stock ? (() => {
                          const existingCartItem = cart.find(item => item.productId === stockId);
                          const currentCartQuantity = existingCartItem ? existingCartItem.quantity : 0;
                          const availableToAdd = remainingQuantity;

                          if (currentCartQuantity > 0) {
                            return `${currentCartQuantity} in cart, ${availableToAdd} more can be added (max ${stock.maxQuantityPerOrder || 10} per order)`;
                          } else {
                            return `Max ${stock.maxQuantityPerOrder || 10} per order, ${stock.quantity} available`;
                          }
                        })() : ''}
                      </span>
                    </div>
                  </div>
                )}

                {!isAdmin && remainingQuantity === 0 && (
                  <div className="mb-6">
                    <div className="text-orange-600 font-semibold">No stock available to add</div>
                  </div>
                )}

                {!isAdmin && (
                  <div className="flex gap-4">
                    <button
                      onClick={async () => {
                        if (stock) {
                          setAddingToCart(true);
                          await addToCart({
                            _id: stock._id,
                            name: stock.name,
                            price: stock.price,
                            image: stock.images[0] || '',
                            filterValues: stock.filterValues,
                            categoryName: resolvedFilterValues.find(fv => fv.attributeName === 'category')?.displayLabel ||
                              getCategoryName(stock.categoryId),
                            subcategoryName: resolvedFilterValues.find(fv => fv.attributeName === 'subcategory')?.displayLabel ||
                              getCategoryName(stock.subcategoryId)
                          }, quantity);
                          setAddingToCart(false);
                          setAddedMessage(true);
                          setTimeout(() => setAddedMessage(false), 2000);
                        }
                      }}
                      disabled={remainingQuantity === 0 || addingToCart}
                      className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                        stock.quantity === 0
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : addedMessage
                          ? 'bg-green-600 text-white shadow-md'
                          : 'bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg active:bg-orange-700'
                      }`}
                    >
                      {addingToCart ? 'Adding...' : addedMessage ? 'Added to Cart!' : remainingQuantity === 0 ? 'Maximum Quantity Reached' : `Add ${validQuantity} to Cart`}
                    </button>
                    <button
                      onClick={handleBack}
                      className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                    >
                      Continue Shopping
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Additional Information Sections (optional) */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Free Shipping</h3>
              <p className="text-gray-600 text-sm">Free shipping on orders over ₹50</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Easy Returns</h3>
              <p className="text-gray-600 text-sm">30-day hassle-free returns</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">24/7 Support</h3>
              <p className="text-gray-600 text-sm">Round the clock customer support</p>
            </div>
          </div>
        </div>
      )}

      <SessionExpiredModal
        isOpen={showSessionExpiredModal}
        onClose={() => setShowSessionExpiredModal(false)}
      />
    </div>
  );
}
