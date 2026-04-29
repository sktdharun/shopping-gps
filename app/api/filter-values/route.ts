import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const filterValues = await db.collection('filter_values').find({}).toArray();
    return NextResponse.json(filterValues);
  } catch (error) {
    console.error('Error fetching filter values:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}