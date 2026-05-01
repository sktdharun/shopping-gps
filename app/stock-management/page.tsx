'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SessionExpiredModal from '../components/SessionExpiredModal';

interface Category {
  _id: string;
  name: string;
  parentId?: string;
  level: number;
}

interface FilterAttribute {
  _id: string;
  name: string;
  categoryId: string;
}

interface FilterValue {
  _id: string;
  attributeId: string;
  value: string;
}

interface Stock {
  _id?: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  maxQuantityPerOrder: number;
  categoryId: string;
  subcategoryId?: string;
  subSubcategoryId?: string;
  filterValues: { attributeId: string; valueId: string }[];
  images: string[];
  isActive: boolean;
}

export default function StockManagementPage() {
  const [user, setUser] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterAttributes, setFilterAttributes] = useState<FilterAttribute[]>([]);
  const [filterValues, setFilterValues] = useState<FilterValue[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState<Omit<Stock, '_id'>>({
    name: '',
    description: '',
    price: 0,
    quantity: 0,
    maxQuantityPerOrder: 5,
    categoryId: '',
    subcategoryId: '',
    subSubcategoryId: '',
    filterValues: [],
    images: [],
    isActive: true
  });

  const [selectedImages, setSelectedImages] = useState<File[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role !== 'admin') {
          router.push('/');
          return;
        }
        setUser(payload);
        fetchData();
      } catch (error) {
        localStorage.removeItem('token');
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, [router]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const [categoriesRes, attributesRes, valuesRes, stocksRes] = await Promise.all([
        fetch('/api/categories', { headers }),
        fetch('/api/filter-attributes', { headers }),
        fetch('/api/filter-values', { headers }),
        fetch('/api/stocks', { headers })
      ]);

      if (!categoriesRes.ok) {
        if (categoriesRes.status === 401) {
          const data = await categoriesRes.json();
          if (data.message === 'Token expired') {
            setShowSessionExpiredModal(true);
            return;
          }
        }
        throw new Error('Failed to fetch categories');
      }
      if (!attributesRes.ok) {
        if (attributesRes.status === 401) {
          const data = await attributesRes.json();
          if (data.message === 'Token expired') {
            setShowSessionExpiredModal(true);
            return;
          }
        }
        throw new Error('Failed to fetch filter attributes');
      }
      if (!valuesRes.ok) {
        if (valuesRes.status === 401) {
          const data = await valuesRes.json();
          if (data.message === 'Token expired') {
            setShowSessionExpiredModal(true);
            return;
          }
        }
        throw new Error('Failed to fetch filter values');
      }
      if (!stocksRes.ok) {
        if (stocksRes.status === 401) {
          const data = await stocksRes.json();
          if (data.message === 'Token expired') {
            setShowSessionExpiredModal(true);
            return;
          }
        }
        throw new Error('Failed to fetch stocks');
      }

      const categoriesData = await categoriesRes.json();
      const attributesData = await attributesRes.json();
      const valuesData = await valuesRes.json();
      const stocksData = await stocksRes.json();

      setCategories(categoriesData);
      setFilterAttributes(attributesData);
      setFilterValues(valuesData);
      setStocks(stocksData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const topLevelCategories = categories.filter(cat => !cat.parentId);
  const subcategories = categories.filter(cat => cat.parentId);
  const availableSubcategories = formData.categoryId ? subcategories.filter(sub => sub.parentId === formData.categoryId) : [];
  const availableSubSubcategories = formData.subcategoryId ? subcategories.filter(sub => sub.parentId === formData.subcategoryId) : [];

  // Determine which category ID to use for filter attributes: sub-subcategory > subcategory > category
  const attributeCategoryId = formData.subSubcategoryId || formData.subcategoryId || formData.categoryId;
  const categoryAttributes = filterAttributes.filter(attr => attr.categoryId === attributeCategoryId);
  const availableValues = (attributeId: string) => filterValues.filter(val => val.attributeId === attributeId);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedImages(prev => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formDataToSend = new FormData();
    formDataToSend.append('stockData', JSON.stringify(formData));

    selectedImages.forEach((image, index) => {
      formDataToSend.append(`image_${index}`, image);
    });

    try {
      const url = editingStock ? `/api/stocks/${editingStock._id}` : '/api/stocks';
      const method = editingStock ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        body: formDataToSend
      });

      if (response.ok) {
        await fetchData();
        setShowAddForm(false);
        setEditingStock(null);
        setFormData({
          name: '',
          description: '',
          price: 0,
          quantity: 0,
          maxQuantityPerOrder: 5,
          categoryId: '',
          subcategoryId: '',
          subSubcategoryId: '',
          filterValues: [],
          images: [],
          isActive: true
        });
        setSelectedImages([]);
      } else {
        console.error('Error saving stock');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleEdit = (stock: Stock) => {
    setEditingStock(stock);
    setFormData({
      name: stock.name,
      description: stock.description,
      price: stock.price,
      quantity: stock.quantity,
      maxQuantityPerOrder: stock.maxQuantityPerOrder,
      categoryId: stock.categoryId,
      subcategoryId: stock.subcategoryId || '',
      subSubcategoryId: stock.subSubcategoryId || '',
      filterValues: stock.filterValues,
      images: stock.images,
      isActive: stock.isActive
    });
    setShowAddForm(true);
  };

  const handleDelete = async (stockId: string) => {
    if (confirm('Are you sure you want to delete this stock?')) {
      try {
        const response = await fetch(`/api/stocks/${stockId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          await fetchData();
        }
      } catch (error) {
        console.error('Error deleting stock:', error);
      }
    }
  };

  const addFilterValue = () => {
    setFormData(prev => ({
      ...prev,
      filterValues: [...prev.filterValues, { attributeId: '', valueId: '' }]
    }));
  };

  const updateFilterValue = (index: number, field: 'attributeId' | 'valueId', value: string) => {
    setFormData(prev => ({
      ...prev,
      filterValues: prev.filterValues.map((fv, i) =>
        i === index ? { ...fv, [field]: value } : fv
      )
    }));
  };

  const removeFilterValue = (index: number) => {
    setFormData(prev => ({
      ...prev,
      filterValues: prev.filterValues.filter((_, i) => i !== index)
    }));
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Stock Management</h1>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
          >
            {showAddForm ? 'Cancel' : 'Add New Stock'}
          </button>
        </div>

        {showAddForm && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-semibold mb-6">
              {editingStock ? 'Edit Stock' : 'Add New Stock'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Quantity Per Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.maxQuantityPerOrder}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxQuantityPerOrder: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum quantity a customer can add to cart (1-10)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      categoryId: e.target.value,
                      subcategoryId: '',
                      subSubcategoryId: '',
                      filterValues: []
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Category</option>
                    {topLevelCategories.map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                 {availableSubcategories.length > 0 && (
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Subcategory
                     </label>
                     <select
                       value={formData.subcategoryId}
                       onChange={(e) => setFormData(prev => ({
                         ...prev,
                         subcategoryId: e.target.value,
                         subSubcategoryId: '',
                         filterValues: []
                       }))}
                       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                     >
                      <option value="">Select Subcategory</option>
                      {availableSubcategories.map(sub => (
                        <option key={sub._id} value={sub._id}>{sub.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {availableSubSubcategories.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sub-subcategory
                    </label>
                    <select
                      value={formData.subSubcategoryId}
                      onChange={(e) => setFormData(prev => ({ ...prev, subSubcategoryId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Type</option>
                      {availableSubSubcategories.map(sub => (
                        <option key={sub._id} value={sub._id}>{sub.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filter Values */}
              {categoryAttributes.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Filter Attributes
                    </label>
                    <button
                      type="button"
                      onClick={addFilterValue}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      + Add Filter
                    </button>
                  </div>
                  {formData.filterValues.map((fv, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <select
                        value={fv.attributeId}
                        onChange={(e) => updateFilterValue(index, 'attributeId', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Attribute</option>
                        {categoryAttributes.map(attr => (
                          <option key={attr._id} value={attr._id}>{attr.name}</option>
                        ))}
                      </select>
                      <select
                        value={fv.valueId}
                        onChange={(e) => updateFilterValue(index, 'valueId', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Value</option>
                        {availableValues(fv.attributeId).map(val => (
                          <option key={val._id} value={val._id}>{val.value}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeFilterValue(index)}
                        className="px-3 py-2 text-red-600 hover:text-red-800"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Images
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="mb-2"
                />
                <div className="flex flex-wrap gap-2">
                  {selectedImages.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Preview ${index + 1}`}
                        className="w-20 h-20 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {editingStock && formData.images.map((imagePath, index) => (
                    <div key={`existing-${index}`} className="relative">
                      <img
                        src={`/api/images?path=${imagePath}`}
                        alt={`Existing ${index + 1}`}
                        className="w-20 h-20 object-cover rounded border"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="mr-2"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
                >
                  {editingStock ? 'Update Stock' : 'Add Stock'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingStock(null);
                    setFormData({
                      name: '',
                      description: '',
                      price: 0,
                      quantity: 0,
                      maxQuantityPerOrder: 5,
                      categoryId: '',
                      subcategoryId: '',
                      subSubcategoryId: '',
                      filterValues: [],
                      images: [],
                      isActive: true
                    });
                    setSelectedImages([]);
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-md font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Stocks List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Current Stocks</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stocks.map((stock) => {
                  const category = categories.find(c => c._id === stock.categoryId);
                  return (
                    <tr key={stock._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {stock.images.length > 0 && (
                            <img
                              src={`/api/images?path=${stock.images[0]}`}
                              alt={stock.name}
                              className="w-10 h-10 rounded object-cover mr-3"
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{stock.name}</div>
                            <div className="text-sm text-gray-500">{stock.description.slice(0, 50)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {category?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${stock.price}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stock.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          stock.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {stock.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEdit(stock)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(stock._id!)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <SessionExpiredModal
        isOpen={showSessionExpiredModal}
        onClose={() => setShowSessionExpiredModal(false)}
      />
    </div>
  );
}