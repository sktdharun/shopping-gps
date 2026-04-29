import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { verifyToken } from '../../../lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify token and check if user is admin
    let payload;
    try {
      payload = verifyToken(request);
    } catch (error) {
      const err = error as { name: string };
      if (err.name === 'TokenExpiredError') {
        return NextResponse.json({ message: 'Token expired' }, { status: 401 });
      }
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }
    // We don't have role in the payload from the login route? Actually we do: we put role in the token.
    // But note: in the login route we set: role: role ? role.name : 'user'
    // So we can check payload.role === 'admin'
    if (payload.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const db = await getDb();

    // Get query parameters for filtering and pagination
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, approved, rejected
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {};
    if (status) {
      // Find the statusId for the given status name
      const statusDoc = await db.collection('statuses').findOne({ name: status });
      if (statusDoc) {
        filter.statusId = statusDoc._id;
      } else {
        // If status not found, return empty
        filter.statusId = new ObjectId(); // invalid id to return nothing
      }
    }

    // Get users with filter, and populate role and status names
    const users = await db.collection('users')
      .aggregate([
        { $match: filter },
        { $lookup: {
            from: 'roles',
            localField: 'roleId',
            foreignField: '_id',
            as: 'role'
          }
        },
        { $lookup: {
            from: 'statuses',
            localField: 'statusId',
            foreignField: '_id',
            as: 'status'
          }
        },
        { $unwind: '$role' },
        { $unwind: '$status' },
        { $project: {
            _id: 1,
            username: 1,
            email: 1,
            firstname: 1,
            lastname: 1,
            role: '$role.name',
            status: '$status.name',
            createdAt: 1
          }
        },
        { $skip: skip },
        { $limit: limit }
      ])
      .toArray();

    // Get total count for pagination
    const total = await db.collection('users').countDocuments(filter);

    return NextResponse.json({
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    let payload;
    try {
      payload = verifyToken(request);
    } catch (error) {
      const err = error as { name: string };
      if (err.name === 'TokenExpiredError') {
        return NextResponse.json({ message: 'Token expired' }, { status: 401 });
      }
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }
    if (payload.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const db = await getDb();
    const { userId, statusId, roleId } = await request.json();

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }

    const updateFields: Record<string, unknown> = {};
    if (statusId) updateFields.statusId = new ObjectId(statusId);
    if (roleId) updateFields.roleId = new ObjectId(roleId);

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
    }

    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User updated successfully' });
  } catch (error: unknown) {
    console.error('Error updating user:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}