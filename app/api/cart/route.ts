import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

// GET /api/cart - fetch user's cart
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Verify token and get user (you may want to use a proper auth middleware)
    const db = await getDb();
    const tokenData = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const userId = tokenData._id;

    const cart = await db.collection('cart').find({ userId: new ObjectId(userId) }).toArray();

    // Join with product details from stocks
    const cartWithDetails = await Promise.all(
      cart.map(async (item) => {
        const stock = await db.collection('stocks').findOne({ _id: item.productId });
        return {
          _id: item._id,
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          categoryName: item.categoryName,
          subcategoryName: item.subcategoryName,
          filterValues: item.filterValues || [],
          stockQuantity: stock?.quantity || 0,
          maxQuantityPerOrder: stock?.maxQuantityPerOrder || 5
        };
      })
    );

    return NextResponse.json(cartWithDetails);
  } catch (error) {
    console.error('Error fetching cart:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// POST /api/cart - add item to cart
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const tokenData = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const userId = tokenData._id;

    const body = await request.json();
    const { productId, name, price, image, quantity = 1, filterValues = [], categoryName, subcategoryName } = body;

    if (!productId || !name || !price) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDb();

    // Check if item already in cart
    const existing = await db.collection('cart').findOne({
      userId: new ObjectId(userId),
      productId: new ObjectId(productId)
    });

    if (existing) {
      // Update quantity
      await db.collection('cart').updateOne(
        { _id: existing._id },
        {
          $inc: { quantity: quantity },
          $set: { updatedAt: new Date() }
        }
      );
      return NextResponse.json({ message: 'Cart updated', cartItemId: existing._id });
    } else {
      // Create new cart item
      const result = await db.collection('cart').insertOne({
        userId: new ObjectId(userId),
        productId: new ObjectId(productId),
        name,
        price,
        image,
        quantity,
        filterValues,
        categoryName,
        subcategoryName,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return NextResponse.json({ message: 'Added to cart', cartItemId: result.insertedId });
    }
  } catch (error) {
    console.error('Error adding to cart:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/cart - clear entire cart
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const tokenData = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const userId = tokenData._id;

    const db = await getDb();
    await db.collection('cart').deleteMany({ userId: new ObjectId(userId) });

    return NextResponse.json({ message: 'Cart cleared' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
