import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const db = await getDb();

    const order = await db.collection('orders').aggregate([
      { $match: { _id: new ObjectId(id) } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'addresses',
          localField: 'addressId',
          foreignField: '_id',
          as: 'address'
        }
      },
      { $unwind: { path: '$address', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'order_statuses',
          localField: 'statusId',
          foreignField: '_id',
          as: 'statusDoc'
        }
      },
      { $unwind: { path: '$statusDoc', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'stocks',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          items: {
            $map: {
              input: '$items',
              as: 'item',
              in: {
                $mergeObjects: [
                  '$$item',
                  {
                    product: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$productDetails',
                            cond: { $eq: ['$$this._id', '$$item.productId'] }
                          }
                        },
                        0
                      ]
                    }
                  }
                ]
              }
            }
          },
          addressId: 1,
          total: 1,
          statusId: 1,
          status: { $ifNull: ['$statusDoc.name', 'unknown'] },
          statusDisplay: { $ifNull: ['$statusDoc.display', 'Unknown'] },
          trackingId: 1,
          deliveryAgent: 1,
          createdAt: 1,
          user: {
            name: { $concat: ['$user.firstname', ' ', '$user.lastname'] },
            email: '$user.email',
            mobile: '$user.mobile'
          },
          address: 1
        }
      }
    ]).toArray();

    if (order.length === 0) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    // Check if user can access this order
    if (decoded.role !== 'admin' && order[0].userId.toString() !== decoded._id) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ order: order[0] });
  } catch (error: unknown) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const { statusName, trackingId, deliveryAgent } = await request.json();

    if (!statusName) {
      return NextResponse.json({ message: 'Status name is required' }, { status: 400 });
    }

    const db = await getDb();

    // Find the order status
    const newStatus = await db.collection('order_statuses').findOne({ name: statusName });
    if (!newStatus) {
      return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
    }

    // Update the order
    const updateData: any = {
      statusId: newStatus._id,
      status: newStatus.name,
      statusDisplay: newStatus.display,
      updatedAt: new Date()
    };

    if (trackingId !== undefined) {
      updateData.trackingId = trackingId;
    }

    if (deliveryAgent !== undefined) {
      updateData.deliveryAgent = deliveryAgent;
    }

    const result = await db.collection('orders').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Order updated successfully',
      status: newStatus.display
    });
  } catch (error: unknown) {
    console.error('Error updating order:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}