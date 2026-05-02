import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();

    // Seed statuses
    const statuses = [
      { name: 'pending' },
      { name: 'approved' },
      { name: 'rejected' }
    ];
    await db.collection('statuses').insertMany(statuses, { ordered: false });

    // Clear existing order statuses and seed new ones
    await db.collection('order_statuses').deleteMany({});
    const orderStatuses = [
      { name: 'ordered', display: 'Ordered' },
      { name: 'approved', display: 'Approved' },
      { name: 'packed_in_transit', display: 'Packed in Transit' },
      { name: 'delivered', display: 'Delivered' },
      { name: 'received', display: 'Received' },
      { name: 'rejected', display: 'Rejected' }
    ];
    await db.collection('order_statuses').insertMany(orderStatuses, { ordered: false });

    // Update existing orders to use correct status IDs
    const statusMap: Record<string, any> = {};
    for (const status of orderStatuses) {
      const doc = await db.collection('order_statuses').findOne({ name: status.name });
      if (doc) {
        statusMap[status.name] = doc._id;
      }
    }

    // Update orders with correct status IDs
    for (const [statusName, statusId] of Object.entries(statusMap)) {
      await db.collection('orders').updateMany(
        { status: statusName },
        { $set: { statusId: statusId } }
      );
    }

    console.log('Database seeded successfully');
    console.log('Order statuses:', orderStatuses);
    console.log('Status map:', statusMap);

    return NextResponse.json({
      message: 'Database seeded successfully',
      orderStatuses,
      statusMap
    });
  } catch (error: unknown) {
    console.error('Error seeding database:', error);
    return NextResponse.json({ message: 'Error seeding database' }, { status: 500 });
  }
}