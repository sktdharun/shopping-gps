import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('path');

    if (!imageUrl) {
      return NextResponse.json({ message: 'Image URL is required' }, { status: 400 });
    }

    // For backward compatibility, check if it's an old local path and redirect to a placeholder
    if (imageUrl.startsWith('/shopping/')) {
      return NextResponse.json({ message: 'Image not found - migrated to Cloudinary' }, { status: 404 });
    }

    // If it's already a full URL (Cloudinary), redirect to it
    if (imageUrl.startsWith('http')) {
      return NextResponse.redirect(imageUrl, { status: 302 });
    }

    return NextResponse.json({ message: 'Invalid image URL' }, { status: 400 });
  } catch (error) {
    console.error('Error serving image:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

