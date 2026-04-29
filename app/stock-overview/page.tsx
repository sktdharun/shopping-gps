'use client';

import { useState, useEffect } from 'react';

interface Stock {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  images: string[];
  categoryId: string;
  subcategoryId?: string;
  subSubcategoryId?: string;
  maxQuantityPerOrder: number;
}

export default function StockOverviewPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/stocks');
        if (!res.ok) {
          throw new Error('Failed to fetch stocks');
        }
        const stocksData = await res.json();
        setStocks(stocksData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium mb-2">Error</div>
          <div className="text-gray-600">{error}</div>
        </div>
      </div>
    );
  }

  // Calculate stock statistics
  const inStockCount = stocks.filter(s => s.quantity > 10).length;
  const lowStockCount = stocks.filter(s => s.quantity > 0 && s.quantity <= 10).length;
  const outOfStockCount = stocks.filter(s => s.quantity === 0).length;
  const lowStockItems = stocks.filter(s => s.quantity <= 10 && s.quantity > 0);
  const outOfStockItems = stocks.filter(s => s.quantity === 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Stock Overview</h1>
          <p className="mt-2 text-gray-600">Monitor inventory levels and stock status</p>
        </div>

        {/* Stock Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
            <div className="flex items-center">
              <div className="flex-1">
                <div className="text-2xl font-bold text-green-600">{inStockCount}</div>
                <div className="text-sm text-green-800">In Stock</div>
                <div className="text-xs text-gray-500 mt-1">Items with &gt;10 quantity</div>
              </div>
              <div className="ml-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
            <div className="flex items-center">
              <div className="flex-1">
                <div className="text-2xl font-bold text-yellow-600">{lowStockCount}</div>
                <div className="text-sm text-yellow-800">Low Stock</div>
                <div className="text-xs text-gray-500 mt-1">Items with 10 or fewer quantity</div>
              </div>
              <div className="ml-4">
                <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-500">
            <div className="flex items-center">
              <div className="flex-1">
                <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
                <div className="text-sm text-red-800">Out of Stock</div>
                <div className="text-xs text-gray-500 mt-1">Items with 0 quantity</div>
              </div>
              <div className="ml-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        {lowStockItems.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Low Stock Alerts
            </h2>
            <div className="space-y-3">
              {lowStockItems.map(stock => (
                <div key={stock._id} className="flex items-center justify-between bg-yellow-50 p-4 rounded-md border border-yellow-200">
                  <div className="flex items-center space-x-3">
                    {stock.images.length > 0 && (
                      <img
                        src={`/api/images?path=${stock.images[0]}`}
                        alt={stock.name}
                        className="w-12 h-12 object-cover rounded-md"
                      />
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{stock.name}</div>
                      <div className="text-sm text-gray-500">ID: {stock._id.slice(-8)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-yellow-700 font-semibold">{stock.quantity} left</div>
                    <div className="text-sm text-gray-500">Max per order: {stock.maxQuantityPerOrder}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Out of Stock Items */}
        {outOfStockItems.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Out of Stock Items
            </h2>
            <div className="space-y-3">
              {outOfStockItems.map(stock => (
                <div key={stock._id} className="flex items-center justify-between bg-red-50 p-4 rounded-md border border-red-200">
                  <div className="flex items-center space-x-3">
                    {stock.images.length > 0 && (
                      <img
                        src={`/api/images?path=${stock.images[0]}`}
                        alt={stock.name}
                        className="w-12 h-12 object-cover rounded-md opacity-50"
                      />
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{stock.name}</div>
                      <div className="text-sm text-gray-500">ID: {stock._id.slice(-8)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-red-700 font-semibold">Out of stock</div>
                    <div className="text-sm text-gray-500">Max per order: {stock.maxQuantityPerOrder}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No alerts message */}
        {lowStockItems.length === 0 && outOfStockItems.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <svg className="w-12 h-12 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">All Stock Levels Good</h3>
            <p className="text-gray-600">No items require attention at this time.</p>
          </div>
        )}
      </div>
    </div>
  );
}