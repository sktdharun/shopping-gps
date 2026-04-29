import React from 'react';
import Link from 'next/link';

interface Product {
  _id?: string;
  id?: number;
  name: string;
  price: number;
  image?: string;
  images?: string[];
  description: string;
  categoryId?: string;
  subcategoryId?: string;
  subSubcategoryId?: string;
  category?: string;
  subcategory?: string;
  subSubcategory?: string;
  categoryName?: string;
  subcategoryName?: string;
  subSubcategoryName?: string;
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  // Get the primary image - handle both 'image' and 'images' fields
  const primaryImage = product.image || (product.images && product.images.length > 0 ? product.images[0] : null);

  return (
    <Link href={`/product/${product._id || product.id}`} className="block">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 group h-full">
        <div className="aspect-square bg-gray-100 relative overflow-hidden">
          {primaryImage ? (
            <img
              src={primaryImage.startsWith('/shopping/') ? `/api/images?path=${primaryImage}` : primaryImage}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
              No Image
            </div>
          )}
          <div className="hidden absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
            Image not found
          </div>
        </div>

        <div className="p-4">
          <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">
            {product.categoryName || product.category}
            {(product.subcategoryName || product.subcategory) && ` • ${product.subcategoryName || product.subcategory}`}
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors duration-200 cursor-pointer">
            {product.name}
          </h3>

          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {product.description}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-gray-900">${product.price}</span>
              <span className="text-sm text-green-600 font-medium">In Stock</span>
            </div>

            <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:shadow-md active:bg-orange-700">
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}