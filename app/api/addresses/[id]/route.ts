import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

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

    const { name, type, addressLine1, addressLine2, city, state, pinCode, mobile, country } = await request.json();

    // Basic validation
    if (!name || !type || !addressLine1 || !addressLine2 || !city || !state || !pinCode || !mobile || !country) {
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
    }

    const db = await getDb();
    const { id } = await params;
    const addressId = new ObjectId(id);

    // Check if address belongs to user
    const existingAddress = await db.collection('addresses').findOne({
      _id: addressId,
      userId: decoded._id
    });

    if (!existingAddress) {
      return NextResponse.json({ message: 'Address not found' }, { status: 404 });
    }

    const updateData = {
      name,
      type,
      addressLine1,
      addressLine2,
      city,
      state,
      pinCode,
      mobile,
      country,
      updatedAt: new Date()
    };

    await db.collection('addresses').updateOne(
      { _id: addressId, userId: decoded._id },
      { $set: updateData }
    );

    return NextResponse.json({ message: 'Address updated successfully' });
  } catch (error: unknown) {
    console.error('Error updating address:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}