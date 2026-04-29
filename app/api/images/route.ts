import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imagePath = searchParams.get('path');

    if (!imagePath) {
      return NextResponse.json({ message: 'Image path is required' }, { status: 400 });
    }

    // Security check - ensure path doesn't contain dangerous characters
    if (imagePath.includes('..') || imagePath.includes('\\') && !imagePath.startsWith('/')) {
      return NextResponse.json({ message: 'Invalid image path' }, { status: 400 });
    }

    // Convert web path to file system path
    const relativePath = imagePath.replace('/shopping/', '');
    const fullPath = path.join('D:\\shopping', relativePath);

    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      return NextResponse.json({ message: 'Image not found' }, { status: 404 });
    }

    // Read and serve the image
    const imageBuffer = await fs.readFile(fullPath);

    // Determine content type based on file extension
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = getContentType(ext);

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

function getContentType(ext: string): string {
  const contentTypes: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };

  return contentTypes[ext] || 'application/octet-stream';
}