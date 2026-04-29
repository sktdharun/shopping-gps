import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const filterAttributes = await db.collection('filter_attributes').find({}).toArray();
    return NextResponse.json(filterAttributes);
  } catch (error) {
    console.error('Error fetching filter attributes:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}