'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import FilterBar from './shop/components/FilterBar';
import ProductGrid from './shop/components/ProductGrid';
import SessionExpiredModal from './components/SessionExpiredModal';

interface Category {
  _id: string;
  name: string;
  parentId?: string;
  level: number;
}

interface Stock {
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
  maxQuantityPerOrder: number;
}

interface Product {
  _id: string;
  name: string;
  price: number;
  image?: string;
  images?: string[];
  description: string;
  categoryId: string;
  subcategoryId?: string;
  subSubcategoryId?: string;
  categoryName?: string;
  subcategoryName?: string;
  subSubcategoryName?: string;
  quantity: number;
}

export default function Home() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState<string>('');
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser(payload);
        setIsAdmin(payload.role === 'admin');
      } catch (error) {
        console.error('Invalid token');
        localStorage.removeItem('token');
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, [router]);

  // Fetch shop data
  useEffect(() => {
    const fetchShopData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const [catRes, productsRes] = await Promise.all([

          fetch('/api/categories', { headers }),

          fetch('/api/shop-data', { headers })

        ]);


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

        if (!productsRes.ok) {
          if (productsRes.status === 401) {
            const data = await productsRes.json();
            if (data.message === 'Token expired') {
              setShowSessionExpiredModal(true);
              return;
            }
          }
          throw new Error('Failed to fetch products');
        }

        const [categoriesData, productsData] = await Promise.all([

          catRes.json(),

          productsRes.json()

        ]);

        setCategories(categoriesData);

        setProducts(productsData.products || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchShopData();
    }
  }, [user]);

  // Process categories into hierarchical structure
  const { categories: topLevelCategories, subcategories, subSubcategories } = useMemo(() => {
    if (!categories.length) return { categories: [], subcategories: [], subSubcategories: [] };

    const topLevelCats = categories.filter(cat => !cat.parentId);
    const allSubcategories = categories.filter(cat => cat.parentId);
    const allSubSubcategories = allSubcategories.filter(cat =>
      allSubcategories.some(sub => sub.parentId === cat._id)
    );

    return {
      categories: topLevelCats,
      subcategories: allSubcategories.filter(sub =>
        topLevelCats.some(cat => cat._id === sub.parentId)
      ),
      subSubcategories: allSubSubcategories
    };
  }, [categories]);

  // Get subcategories for selected category
  const availableSubcategories = useMemo(() => {
    if (!selectedCategory || !categories.length) return [];
    return subcategories.filter(sub => sub.parentId === selectedCategory);
  }, [selectedCategory, subcategories, categories]);

  // Get sub-subcategories for selected subcategory
  const availableSubSubcategories = useMemo(() => {
    if (!selectedSubcategory || !categories.length) return [];
    return subSubcategories.filter(sub => sub.parentId === selectedSubcategory);
  }, [selectedSubcategory, subSubcategories, categories]);

  // Use products from state (fetched from shop-data API)
  // allProducts is already the products state variable

  // Filter products based on selections
  const filteredProducts = useMemo(() => {
    if (!products.length) return [];

    return products.filter(product => {
      if (selectedCategory && product.categoryId !== selectedCategory) return false;
      if (selectedSubcategory && product.subcategoryId !== selectedSubcategory) return false;
      if (selectedSubSubcategory && product.subSubcategoryId !== selectedSubSubcategory) return false;
      return true;
    });
  }, [products, selectedCategory, selectedSubcategory, selectedSubSubcategory]);

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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Shop Content */}
      <main className="flex-grow bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Shop</h1>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading products...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-500 mb-4">Error loading data</div>
              <p className="text-gray-600">{error}</p>
            </div>
          ) : (
            <div>
              <FilterBar
                categories={topLevelCategories}
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
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white p-4 text-center">
        <p>Footer content. Dummy text. © 2026 Shopping Site. All rights reserved.</p>
      </footer>

      <SessionExpiredModal
        isOpen={showSessionExpiredModal}
        onClose={() => setShowSessionExpiredModal(false)}
      />
    </div>
  );
}
