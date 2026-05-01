'use client';

import React, { useState, useMemo, useEffect } from 'react';
import FilterBar from './components/FilterBar';
import ProductGrid from './components/ProductGrid';

interface Product {
  _id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  categoryId: string;
  subcategoryId?: string;
  subSubcategoryId?: string;
  categoryName?: string;
  subcategoryName?: string;
  subSubcategoryName?: string;
  quantity: number;
}

interface Category {
  _id: string;
  name: string;
  parentId?: string;
  level: number;
}

interface ShopData {
  categories: Category[];
  filterAttributes: FilterAttribute[];
  filterValues: FilterValue[];
  products: Product[];
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

export default function ShopPage() {
  const [shopData, setShopData] = useState<ShopData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Fetch data from API
  useEffect(() => {
    const fetchShopData = async () => {
      try {
        const response = await fetch('/api/shop-data');
        if (!response.ok) {
          throw new Error('Failed to fetch shop data');
        }
        const data = await response.json();
        setShopData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchShopData();
  }, []);

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

  // Process categories into hierarchical structure
  const { categories, subcategories, subSubcategories } = useMemo(() => {
    if (!shopData) return { categories: [], subcategories: [], subSubcategories: [] };

    const topLevelCategories = shopData.categories.filter(cat => !cat.parentId);
    const allSubcategories = shopData.categories.filter(cat => cat.parentId);
    const allSubSubcategories = allSubcategories.filter(cat =>
      allSubcategories.some(sub => sub.parentId === cat._id)
    );

    return {
      categories: topLevelCategories,
      subcategories: allSubcategories.filter(sub =>
        topLevelCategories.some(cat => cat._id === sub.parentId)
      ),
      subSubcategories: allSubSubcategories
    };
  }, [shopData]);

  // Get subcategories for selected category
  const availableSubcategories = useMemo(() => {
    if (!selectedCategory || !shopData) return [];
    return subcategories.filter(sub => sub.parentId === selectedCategory);
  }, [selectedCategory, subcategories, shopData]);

  // Get sub-subcategories for selected subcategory
  const availableSubSubcategories = useMemo(() => {
    if (!selectedSubcategory || !shopData) return [];
    return subSubcategories.filter(sub => sub.parentId === selectedSubcategory);
  }, [selectedSubcategory, subSubcategories, shopData]);

  // Filter products based on selections and sort out-of-stock last
  const filteredProducts = useMemo(() => {
    if (!shopData) return [];

    return shopData.products.filter(product => {
      if (selectedCategory && product.categoryId !== selectedCategory) return false;
      if (selectedSubcategory && product.subcategoryId !== selectedSubcategory) return false;
      if (selectedSubSubcategory && product.subSubcategoryId !== selectedSubSubcategory) return false;
      return true;
    }).map(product => {
      // Add category names for display
      const category = shopData.categories.find(c => c._id === product.categoryId);
      const subcategory = product.subcategoryId ? shopData.categories.find(c => c._id === product.subcategoryId) : null;
      const subSubcategory = product.subSubcategoryId ? shopData.categories.find(c => c._id === product.subSubcategoryId) : null;

      return {
        ...product,
        categoryName: category?.name || 'Unknown',
        subcategoryName: subcategory?.name || '',
        subSubcategoryName: subSubcategory?.name || ''
      };
    }).sort((a, b) => {
      // Sort out-of-stock items (quantity <= 0) to the end
      const aOutOfStock = (a.quantity || 0) <= 0;
      const bOutOfStock = (b.quantity || 0) <= 0;

      if (aOutOfStock && !bOutOfStock) return 1;
      if (!aOutOfStock && bOutOfStock) return -1;
      return 0;
    });
  }, [shopData, selectedCategory, selectedSubcategory, selectedSubSubcategory]);

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory('');
    setSelectedSubSubcategory('');
  };

  const handleSubcategoryChange = (subcategoryId: string) => {
    setSelectedSubcategory(subcategoryId);
    setSelectedSubSubcategory('');
  };

  const handleSubSubcategoryChange = (subSubcategoryId: string) => {
    setSelectedSubSubcategory(subSubcategoryId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading products...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">Error loading shop data</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shop</h1>

        <FilterBar
          categories={categories}
          subcategories={availableSubcategories}
          subSubcategories={availableSubSubcategories}
          selectedCategory={selectedCategory}
          selectedSubcategory={selectedSubcategory}
          selectedSubSubcategory={selectedSubSubcategory}
          onCategoryChange={handleCategoryChange}
          onSubcategoryChange={handleSubcategoryChange}
          onSubSubcategoryChange={handleSubSubcategoryChange}
        />

        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {filteredProducts.length} Products
            </h2>
            {selectedCategory && (
              <div className="text-sm text-gray-600">
                Showing results for: {categories.find(c => c._id === selectedCategory)?.name}
                {selectedSubcategory && ` > ${availableSubcategories.find(s => s._id === selectedSubcategory)?.name}`}
                {selectedSubSubcategory && ` > ${availableSubSubcategories.find(s => s._id === selectedSubSubcategory)?.name}`}
              </div>
            )}
          </div>

          <ProductGrid products={filteredProducts} isAdmin={isAdmin} />
        </div>
      </div>
    </div>
  );
}

