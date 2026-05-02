import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';

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

    // Check if user is admin
    if (decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 10;
    const status = searchParams.get('status');
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {};
    if (status) {
      filter.status = status;
    }

    // Get total count for pagination
    const totalOrders = await db.collection('orders').countDocuments(filter);

    // Get orders with pagination and status display
    const orders = await db.collection('orders').aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'order_statuses',
          localField: 'statusId',
          foreignField: '_id',
          as: 'statusDoc'
        }
      },
      { $unwind: '$statusDoc' },
      {
        $project: {
          _id: 1,
          userId: 1,
          items: 1,
          addressId: 1,
          total: 1,
          statusId: 1,
          status: '$statusDoc.name',
          statusDisplay: '$statusDoc.display',
          trackingId: 1,
          deliveryAgent: 1,
          createdAt: 1
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ]).toArray();

    // Get user details for each order
    const ordersWithUserDetails = await Promise.all(
      orders.map(async (order) => {
        const user = await db.collection('users').findOne(
          { _id: new ObjectId(order.userId) },
          { projection: { firstname: true, lastname: true, email: true, mobile: true } }
        );

        const address = await db.collection('addresses').findOne(
          { _id: new ObjectId(order.addressId) },
          { projection: { name: true, addressLine1: true, addressLine2: true, city: true, state: true, pinCode: true, mobile: true } }
        );

        return {
          ...order,
          user: user ? {
            name: `${user.firstname} ${user.lastname}`,
            email: user.email,
            mobile: user.mobile
          } : null,
          address: address || null
        };
      })
    );

    return NextResponse.json({
      orders: ordersWithUserDetails,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalOrders / limit),
        totalOrders,
        hasNext: page * limit < totalOrders,
        hasPrev: page > 1
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching orders for admin:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}