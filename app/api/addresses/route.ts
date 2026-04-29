import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/mongodb';
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

    const db = await getDb();
    const addresses = await db.collection('addresses').find({ userId: decoded._id }).toArray();

    return NextResponse.json({ addresses });
  } catch (error: unknown) {
    console.error('Error fetching addresses:', error);
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

    const { name, type, addressLine1, addressLine2, city, state, pinCode, mobile, country } = await request.json();

    // Basic validation
    if (!name || !type || !addressLine1 || !addressLine2 || !city || !state || !pinCode || !mobile || !country) {
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
    }

    const db = await getDb();
    const address = {
      userId: decoded._id,
      name,
      type,
      addressLine1,
      addressLine2,
      city,
      state,
      pinCode,
      mobile,
      country,
      createdAt: new Date()
    };

    const result = await db.collection('addresses').insertOne(address);

    return NextResponse.json({
      message: 'Address saved successfully',
      addressId: result.insertedId
    });
  } catch (error: unknown) {
    console.error('Error saving address:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}