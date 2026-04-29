'use client';

import React from 'react';

interface Category {
  _id: string;
  name: string;
  parentId?: string;
  level: number;
}

interface FilterBarProps {
  categories: Category[];
  subcategories: Category[];
  subSubcategories: Category[];
  selectedCategory: string;
  selectedSubcategory: string;
  selectedSubSubcategory: string;
  onCategoryChange: (categoryId: string) => void;
  onSubcategoryChange: (subcategoryId: string) => void;
  onSubSubcategoryChange: (subSubcategoryId: string) => void;
}

export default function FilterBar({
  categories,
  subcategories,
  subSubcategories,
  selectedCategory,
  selectedSubcategory,
  selectedSubSubcategory,
  onCategoryChange,
  onSubcategoryChange,
  onSubSubcategoryChange,
}: FilterBarProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            id="category"
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label htmlFor="subcategory" className="block text-sm font-medium text-gray-700 mb-2">
            Subcategory
          </label>
          <select
            id="subcategory"
            value={selectedSubcategory}
            onChange={(e) => onSubcategoryChange(e.target.value)}
            disabled={!selectedCategory}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">All Subcategories</option>
            {subcategories.map((subcategory) => (
              <option key={subcategory._id} value={subcategory._id}>
                {subcategory.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label htmlFor="subSubcategory" className="block text-sm font-medium text-gray-700 mb-2">
            Type
          </label>
          <select
            id="subSubcategory"
            value={selectedSubSubcategory}
            onChange={(e) => onSubSubcategoryChange(e.target.value)}
            disabled={!selectedSubcategory}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">All Types</option>
            {subSubcategories.map((subSubcategory) => (
              <option key={subSubcategory._id} value={subSubcategory._id}>
                {subSubcategory.name}
              </option>
            ))}
          </select>
        </div>

        {(selectedCategory || selectedSubcategory || selectedSubSubcategory) && (
          <button
            onClick={() => {
              onCategoryChange('');
              onSubcategoryChange('');
              onSubSubcategoryChange('');
            }}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors duration-200"
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}