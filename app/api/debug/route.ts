import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();

    // Check current order statuses
    const orderStatuses = await db.collection('order_statuses').find({}).toArray();

    // Check current orders
    const orders = await db.collection('orders').find({}).limit(5).toArray();

    return NextResponse.json({
      orderStatuses,
      orders: orders.map(order => ({
        _id: order._id,
        status: order.status,
        statusId: order.statusId,
        statusDisplay: order.statusDisplay
      }))
    });
  } catch (error: unknown) {
    console.error('Error:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}