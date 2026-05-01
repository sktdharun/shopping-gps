import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { promises as fs } from 'fs';
import path from 'path';
import { verifyToken } from '../../../lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify token
    const payload = verifyToken(request) as { _id: string; role: string };

    const db = await getDb();
    let stockQuery = {};
    if (payload.role !== 'admin') {
      stockQuery = { isActive: true };
    }
    const stocks = await db.collection('stocks').find(stockQuery).toArray();
    return NextResponse.json(stocks);
  } catch (error) {
    console.error('Error fetching stocks:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify token and check admin role
    const payload = verifyToken(request) as { _id: string; role: string };
    if (payload.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const formData = await request.formData();
    const stockData = JSON.parse(formData.get('stockData') as string);

    // Create directory structure for images
    const baseDir = 'D:\\shopping';
    try {
      await fs.access(baseDir);
    } catch {
      await fs.mkdir(baseDir, { recursive: true });
    }

    const categoryName = await getCategoryName(stockData.categoryId);
    const categoryDir = path.join(baseDir, sanitizeFolderName(categoryName));

    // Ensure category directory exists
    await fs.mkdir(categoryDir, { recursive: true });

    // Handle image uploads
    const imagePaths: string[] = [];
    const imageFiles = [];

    // Collect all image files
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('image_') && value instanceof File) {
        imageFiles.push(value);
      }
    }

    // Save images
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const fileName = `${Date.now()}_${i}_${file.name}`;
      const filePath = path.join(categoryDir, fileName);

      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePath, buffer);

      // Store relative path for web access
      const relativePath = `/shopping/${sanitizeFolderName(categoryName)}/${fileName}`;
      imagePaths.push(relativePath);
    }

    // Save to database
    const db = await getDb();
    const stockDocument = {
      ...stockData,
      images: imagePaths,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('stocks').insertOne(stockDocument);

    return NextResponse.json({
      message: 'Stock created successfully',
      stockId: result.insertedId
    });
  } catch (error) {
    console.error('Error creating stock:', error);
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