import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/mongodb';
import { verifyToken } from '../../../lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify token
    try {
      verifyToken(request);
    } catch (error) {
      const err = error as { name: string };
      if (err.name === 'TokenExpiredError') {
        return NextResponse.json({ message: 'Token expired' }, { status: 401 });
      }
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const db = await getDb();
    const filterValues = await db.collection('filter_values').find({}).toArray();
    return NextResponse.json(filterValues);
  } catch (error) {
    console.error('Error fetching filter values:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}