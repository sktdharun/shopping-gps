import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { verifyToken } from '../../../../lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify token
    const payload = verifyToken(request) as { _id: string; role: string };

    const db = await getDb();
    const { id } = await params;
    const query: any = { _id: new ObjectId(id) };
    if (payload.role !== 'admin') {
      query.isActive = true;
    }
    const product = await db.collection('stocks').findOne(query);

    if (!product) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error: unknown) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}