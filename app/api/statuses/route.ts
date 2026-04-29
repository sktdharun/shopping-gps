import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const statuses = await db.collection('statuses').find({}).toArray();
    return NextResponse.json({ statuses });
  } catch (error: unknown) {
    console.error('Error fetching statuses:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}