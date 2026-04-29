import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const roles = await db.collection('roles').find({}).toArray();
    return NextResponse.json({ roles });
  } catch (error: unknown) {
    console.error('Error fetching roles:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}