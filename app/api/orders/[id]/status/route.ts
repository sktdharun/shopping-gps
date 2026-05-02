import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

interface StatusTransition {
  from: string[];
  to: string;
  allowedRoles: string[];
}

// Define allowed status transitions using display values
const STATUS_TRANSITIONS: StatusTransition[] = [
  // User can create ordered status (but this is handled during order creation)
  { from: [], to: 'Ordered', allowedRoles: ['user'] },

  // Admin can approve ordered orders
  { from: ['Ordered'], to: 'Approved', allowedRoles: ['admin'] },

  // Admin can reject ordered orders
  { from: ['Ordered'], to: 'Rejected', allowedRoles: ['admin'] },

  // Admin can pack ordered or approved orders
  { from: ['Ordered', 'Approved'], to: 'Packaged', allowedRoles: ['admin'] },

  // Admin can send to transit ordered, approved, or packaged orders
  { from: ['Ordered', 'Approved', 'Packaged'], to: 'In Transit', allowedRoles: ['admin'] },

  // User can mark InTransit orders as received
  { from: ['In Transit'], to: 'Received', allowedRoles: ['user'] },

  // Admin can mark InTransit or received orders as delivered
  { from: ['In Transit', 'Received'], to: 'Delivered', allowedRoles: ['admin'] }
];

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const { id: orderId } = await params;
    const { newStatus, trackingId, deliveryAgent } = await request.json();

    if (!newStatus) {
      return NextResponse.json({ message: 'New status is required' }, { status: 400 });
    }

    // Get the current order
    const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId) });
    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    // Check if user owns this order or is admin
    if (decoded.role !== 'admin' && order.userId.toString() !== decoded._id) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    // Get the current status document
    const currentStatusDoc = await db.collection('order_statuses').findOne({ _id: order.statusId });
    if (!currentStatusDoc) {
      return NextResponse.json({ message: 'Current status not found' }, { status: 500 });
    }

    // Get the new status document
    const newStatusDoc = await db.collection('order_statuses').findOne({ name: newStatus });
    if (!newStatusDoc) {
      return NextResponse.json({ message: 'Status not found' }, { status: 500 });
    }

    // Find valid transition using display values
    const validTransition = STATUS_TRANSITIONS.find(
      transition => transition.to === newStatusDoc.display &&
                   transition.from.includes(currentStatusDoc.display) &&
                   transition.allowedRoles.includes(decoded.role)
    );

    if (!validTransition) {
      return NextResponse.json({
        message: `Invalid status transition from '${currentStatusDoc.display}' to '${newStatusDoc.display}' for role '${decoded.role}'`
      }, { status: 400 });
    }

    // Handle stock restoration for rejected orders
    if (newStatus === 'rejected') {
      // Restore stock for all items in the order
      for (const item of order.items) {
        await db.collection('stocks').updateOne(
          { productId: new ObjectId(item.productId) },
          { $inc: { quantity: item.quantity } }
        );
      }
    }

    // Prepare update object
    const updateData: any = {
      statusId: newStatusDoc._id,
      status: newStatus,
      statusDisplay: newStatusDoc.display,
      updatedAt: new Date().toISOString()
    };

    // Add tracking info if provided
    if (trackingId) {
      updateData.trackingId = trackingId;
    }
    if (deliveryAgent) {
      updateData.deliveryAgent = deliveryAgent;
    }

    // Add timestamps for status changes
    if (newStatus === 'approved') {
      updateData.approvedAt = new Date().toISOString();
      updateData.approvedBy = decoded._id;
    } else if (newStatus === 'packaged') {
      updateData.packagedAt = new Date().toISOString();
      updateData.packagedBy = decoded._id;
    } else if (newStatus === 'InTransit') {
      updateData.inTransitAt = new Date().toISOString();
      updateData.inTransitBy = decoded._id;
    } else if (newStatus === 'delivered') {
      updateData.deliveredAt = new Date().toISOString();
      updateData.deliveredBy = decoded._id;
    } else if (newStatus === 'received') {
      updateData.receivedAt = new Date().toISOString();
      updateData.receivedBy = decoded._id;
    } else if (newStatus === 'rejected') {
      updateData.rejectedAt = new Date().toISOString();
      updateData.rejectedBy = decoded._id;
    }

    // Update the order
    const result = await db.collection('orders').updateOne(
      { _id: new ObjectId(orderId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: `Order status updated to ${newStatus}`,
      order: { ...order, ...updateData }
    });
  } catch (error: unknown) {
    console.error('Error updating order status:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}