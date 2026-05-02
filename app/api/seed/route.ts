import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();

    // Seed statuses for users
    const userStatuses = [
      { name: 'pending' },
      { name: 'approved' },
      { name: 'rejected' }
    ];
    await db.collection('statuses').insertMany(userStatuses, { ordered: false });

    // Seed statuses for orders
    const orderStatuses = [
      { name: 'ordered', display: 'Ordered' },
      { name: 'approved', display: 'Approved' },
      { name: 'packaged', display: 'Packaged' },
      { name: 'InTransit', display: 'In Transit' },
      { name: 'delivered', display: 'Delivered' },
      { name: 'received', display: 'Received' },
      { name: 'rejected', display: 'Rejected' }
    ];
    await db.collection('order_statuses').insertMany(orderStatuses, { ordered: false });

    // Seed roles
    const roles = [
      { name: 'user' },
      { name: 'admin' }
    ];
    await db.collection('roles').insertMany(roles, { ordered: false });

    return NextResponse.json({ message: 'Database seeded successfully' });
  } catch (error: unknown) {
    console.error('Error seeding database:', error);
    return NextResponse.json({ message: 'Error seeding database' }, { status: 500 });
  }
}