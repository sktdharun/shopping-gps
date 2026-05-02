import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const orderStatuses = await db.collection('order_statuses').find({}).toArray();
    return NextResponse.json({ orderStatuses });
  } catch (error: unknown) {
    console.error('Error fetching order statuses:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}