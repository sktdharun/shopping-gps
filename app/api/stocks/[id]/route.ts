import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: stockId } = await params;
    const db = await getDb();

    const stock = await db.collection('stocks').findOne({ _id: new ObjectId(stockId) });
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
    const { id: stockId } = await params;
    const formData = await request.formData();
    const stockData = JSON.parse(formData.get('stockData') as string);

    const db = await getDb();

    // Get existing stock to handle image updates
    const existingStock = await db.collection('stocks').findOne({ _id: new ObjectId(stockId) });
    if (!existingStock) {
      return NextResponse.json({ message: 'Stock not found' }, { status: 404 });
    }

    // Handle image uploads for updates
    const baseDir = 'D:\\shopping';
    try {
      await fs.access(baseDir);
    } catch {
      await fs.mkdir(baseDir, { recursive: true });
    }

    const categoryName = await getCategoryName(stockData.categoryId);
    const categoryDir = path.join(baseDir, sanitizeFolderName(categoryName));
    await fs.mkdir(categoryDir, { recursive: true });

    const imagePaths: string[] = [...(stockData.images || [])]; // Keep existing images
    const imageFiles = [];

    // Collect new image files
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('image_') && value instanceof File) {
        imageFiles.push(value);
      }
    }

    // Save new images
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const fileName = `${Date.now()}_${i}_${file.name}`;
      const filePath = path.join(categoryDir, fileName);

      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePath, buffer);

      const relativePath = `/shopping/${sanitizeFolderName(categoryName)}/${fileName}`;
      imagePaths.push(relativePath);
    }

    // Update database
    const updateData = {
      ...stockData,
      images: imagePaths,
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
    const { id: stockId } = await params;
    const db = await getDb();

    // Get stock to delete associated images
    const stock = await db.collection('stocks').findOne({ _id: new ObjectId(stockId) });

    if (stock && stock.images) {
      // Delete image files
      for (const imagePath of stock.images) {
        try {
          // Convert web path to file system path
          const relativePath = imagePath.replace('/shopping/', '');
          const fullPath = path.join('D:\\shopping', relativePath);
          await fs.unlink(fullPath);
        } catch (error) {
          console.error('Error deleting image file:', error);
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