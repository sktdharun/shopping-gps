import React from 'react';
import ProductCard from './ProductCard';

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
}

interface ProductGridProps {
  products: Product[];
}

export default function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">No products found</div>
        <div className="text-gray-400 text-sm mt-2">Try adjusting your filters</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
}