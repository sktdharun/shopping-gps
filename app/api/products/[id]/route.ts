import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb();
    const { id } = await params;
    const product = await db.collection('stocks').findOne({
      _id: new ObjectId(id),
      isActive: true
    });

    if (!product) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error: unknown) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}