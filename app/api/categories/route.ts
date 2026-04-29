import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const categories = await db.collection('categories').find({}).toArray();
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}