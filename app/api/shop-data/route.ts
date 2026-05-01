import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/mongodb';
import { verifyToken } from '../../../lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify token
    const payload = verifyToken(request) as { _id: string; role: string };

    const db = await getDb();

    // Get all collection names
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);

    console.log('Available collections:', collectionNames);

    // Fetch all categories
    const categories = await db.collection('categories').find({}).toArray();
    console.log('Categories sample:', categories.slice(0, 3));

    // Fetch all filter attributes
    const filterAttributes = await db.collection('filter_attributes').find({}).toArray();
    console.log('Filter attributes sample:', filterAttributes.slice(0, 3));

    // Fetch all filter values
    const filterValues = await db.collection('filter_values').find({}).toArray();
    console.log('Filter values sample:', filterValues.slice(0, 3));

    // Fetch active products for landing screen (same for all roles)
    const products = await db.collection('stocks').find({ isActive: true }).toArray();
    console.log('Products sample:', products.slice(0, 3));

    return NextResponse.json({
      collections: collectionNames,
      categories,
      filterAttributes,
      filterValues,
      products,
      totalCategories: categories.length,
      totalFilterAttributes: filterAttributes.length,
      totalFilterValues: filterValues.length,
      totalProducts: products.length,
      // Analysis of data structure
      categoryStructure: categories.length > 0 ? Object.keys(categories[0]) : [],
      productStructure: products.length > 0 ? Object.keys(products[0]) : [],
      filterAttributeStructure: filterAttributes.length > 0 ? Object.keys(filterAttributes[0]) : [],
      filterValueStructure: filterValues.length > 0 ? Object.keys(filterValues[0]) : []
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}