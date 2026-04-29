import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

// PUT /api/cart/[id] - update cart item quantity
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cartItemId } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const tokenData = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const userId = tokenData._id;

    const body = await request.json();
    const { quantity } = body;

    if (!quantity || quantity < 1) {
      return NextResponse.json({ message: 'Invalid quantity' }, { status: 400 });
    }

    const db = await getDb();

    // Verify ownership
    const cartItem = await db.collection('cart').findOne({
      _id: new ObjectId(cartItemId),
      userId: new ObjectId(userId)
    });

    if (!cartItem) {
      return NextResponse.json({ message: 'Cart item not found' }, { status: 404 });
    }

    await db.collection('cart').updateOne(
      { _id: new ObjectId(cartItemId) },
      { $set: { quantity, updatedAt: new Date() } }
    );

    return NextResponse.json({ message: 'Cart updated' });
  } catch (error) {
    console.error('Error updating cart:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/cart/[id] - remove item from cart
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cartItemId } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const tokenData = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const userId = tokenData._id;

    const db = await getDb();

    // Verify ownership and delete
    const result = await db.collection('cart').deleteOne({
      _id: new ObjectId(cartItemId),
      userId: new ObjectId(userId)
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: 'Cart item not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Error removing from cart:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
