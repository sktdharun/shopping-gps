import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    } catch (error) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const db = await getDb();
    const orders = await db.collection('orders').find({ userId: decoded._id }).sort({ createdAt: -1 }).toArray();

    return NextResponse.json({ orders });
  } catch (error: unknown) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    } catch (error) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const { items, addressId, total } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0 || !addressId || !total) {
      return NextResponse.json({ message: 'Invalid order data' }, { status: 400 });
    }

    const db = await getDb();

    // Validate stock availability
    for (const item of items) {
      const product = await db.collection('stocks').findOne({ _id: new ObjectId(item.productId), isActive: true });
      if (!product) {
        return NextResponse.json({ message: `Product ${item.name} not found` }, { status: 400 });
      }
      if (product.quantity < item.quantity) {
        return NextResponse.json({
          message: `Insufficient stock for ${item.name}. Available: ${product.quantity}, Requested: ${item.quantity}`
        }, { status: 400 });
      }
    }

    // Ensure order statuses exist in order_statuses collection
    const requiredStatuses = ['ordered', 'approved', 'packaged', 'InTransit', 'delivered', 'received', 'rejected'];
    for (const statusName of requiredStatuses) {
      const existing = await db.collection('order_statuses').findOne({ name: statusName });
      if (!existing) {
        await db.collection('order_statuses').insertOne({ name: statusName });
      }
    }

    // Get ordered status
    const orderedStatus = await db.collection('order_statuses').findOne({ name: 'ordered' });
    if (!orderedStatus) {
      return NextResponse.json({ message: 'Order status not found' }, { status: 500 });
    }

    // Create order
    const order = {
      userId: decoded._id,
      items,
      addressId: new ObjectId(addressId),
      total,
      statusId: orderedStatus._id,
      status: orderedStatus.name,
      trackingId: null,
      deliveryAgent: null,
      createdAt: new Date()
    };

    const result = await db.collection('orders').insertOne(order);

    // Update stock quantities
    for (const item of items) {
      await db.collection('stocks').updateOne(
        { _id: new ObjectId(item.productId) },
        { $inc: { quantity: -item.quantity } }
      );
    }

    return NextResponse.json({
      message: 'Order placed successfully',
      orderId: result.insertedId
    });
  } catch (error: unknown) {
    console.error('Error creating order:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}