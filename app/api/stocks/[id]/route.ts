import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { verifyToken } from '../../../../lib/auth';
import { uploadImageToCloudinary, deleteImageFromCloudinary } from '../../../../lib/cloudinary';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Verify token
    const payload = verifyToken(request) as { _id: string; role: string };

    const { id: stockId } = await params;
    const db = await getDb();

    const query: any = { _id: new ObjectId(stockId) };
    if (payload.role !== 'admin') {
      query.isActive = true;
    }
    const stock = await db.collection('stocks').findOne(query);
    if (!stock) {
      return NextResponse.json({ message: 'Stock not found' }, { status: 404 });
    }

    return NextResponse.json(stock);
  } catch (error) {
    console.error('Error fetching stock:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Verify token and check admin role
    const payload = verifyToken(request) as { _id: string; role: string };
    if (payload.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const { id: stockId } = await params;
    const formData = await request.formData();
    const stockData = JSON.parse(formData.get('stockData') as string);

    const db = await getDb();

    // Get existing stock to handle image updates
    const existingStock = await db.collection('stocks').findOne({ _id: new ObjectId(stockId) });
    if (!existingStock) {
      return NextResponse.json({ message: 'Stock not found' }, { status: 404 });
    }

    const categoryName = await getCategoryName(stockData.categoryId);

    const imageUrls: string[] = [...(stockData.images || [])]; // Keep existing images
    const imageFiles = [];

    // Collect new image files
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('image_') && value instanceof File) {
        imageFiles.push(value);
      }
    }

    // Upload new images to Cloudinary
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const imageUrl = await uploadImageToCloudinary(file, sanitizeFolderName(categoryName));
      imageUrls.push(imageUrl);
    }

    // Update database
    const updateData = {
      ...stockData,
      images: imageUrls,
      updatedAt: new Date()
    };

    await db.collection('stocks').updateOne(
      { _id: new ObjectId(stockId) },
      { $set: updateData }
    );

    return NextResponse.json({ message: 'Stock updated successfully' });
  } catch (error) {
    console.error('Error updating stock:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Verify token and check admin role
    const payload = verifyToken(request) as { _id: string; role: string };
    if (payload.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const { id: stockId } = await params;
    const db = await getDb();

    // Get stock to delete associated images
    const stock = await db.collection('stocks').findOne({ _id: new ObjectId(stockId) });

    if (stock && stock.images) {
      // Delete images from Cloudinary
      for (const imageUrl of stock.images) {
        try {
          await deleteImageFromCloudinary(imageUrl);
        } catch (error) {
          console.error('Error deleting image from Cloudinary:', error);
        }
      }
    }

    // Delete from database
    await db.collection('stocks').deleteOne({ _id: new ObjectId(stockId) });

    return NextResponse.json({ message: 'Stock deleted successfully' });
  } catch (error) {
    console.error('Error deleting stock:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

async function getCategoryName(categoryId: string): Promise<string> {
  const db = await getDb();
  let objectId: ObjectId;
  try {
    objectId = new ObjectId(categoryId);
  } catch {
    return 'Unknown';
  }
  const category = await db.collection('categories').findOne({ _id: objectId });
  return category?.name || 'Unknown';
}

function sanitizeFolderName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
}