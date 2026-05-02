import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Get the order
    const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId) });
    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    // Check if user owns this order or is admin
    if (decoded.role !== 'admin' && order.userId.toString() !== decoded._id) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    // Get detailed product information for each item
    const orderItemsWithDetails = await Promise.all(
      order.items.map(async (item: any) => {
        const product = await db.collection('stocks').findOne(
          { _id: new ObjectId(item.productId) },
          {
            projection: {
              name: true,
              description: true,
              price: true,
              images: true,
              categoryId: true,
              attributes: true
            }
          }
        );

        // Get category information
        let category = null;
        if (product?.categoryId) {
          category = await db.collection('categories').findOne(
            { _id: new ObjectId(product.categoryId) },
            { projection: { name: true } }
          );
        }

        return {
          ...item,
          product: product ? {
            ...product,
            category: category?.name || 'Unknown'
          } : null
        };
      })
    );

    // Get user details
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(order.userId) },
      { projection: { firstname: true, lastname: true, email: true, mobile: true } }
    );

    // Get address details
    let address = null;
    if (order.addressId) {
      address = await db.collection('addresses').findOne(
        { _id: new ObjectId(order.addressId) },
        { projection: { name: true, addressLine1: true, addressLine2: true, city: true, state: true, pinCode: true, mobile: true } }
      );
    }

    const detailedOrder = {
      ...order,
      items: orderItemsWithDetails,
      user: user ? {
        name: `${user.firstname} ${user.lastname}`,
        email: user.email,
        mobile: user.mobile
      } : null,
      address: address
    };

    return NextResponse.json({ order: detailedOrder });
  } catch (error: unknown) {
    console.error('Error fetching order details:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}