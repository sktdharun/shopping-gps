import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      firstname,
      lastname,
      email,
      username,
      password,
      gender,
      mobile,
      roleId
    } = body;

    // Basic validation
    if (!firstname || !lastname || !email || !username || !password || !gender || !mobile || !roleId) {
      return NextResponse.json({
        message: 'All required fields must be provided',
        errors: { general: 'Please fill in all required fields' }
      }, { status: 400 });
    }

    const db = await getDb();

    // Check for unique constraints
    const existingUser = await db.collection('users').findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() },
        { mobile: mobile }
      ]
    });

    const errors: Record<string, string> = {};

    if (existingUser) {
      if (existingUser.username === username.toLowerCase()) {
        errors.username = 'Username is already taken';
      }
      if (existingUser.email === email.toLowerCase()) {
        errors.email = 'Email is already registered';
      }
      if (existingUser.mobile === mobile) {
        errors.mobile = 'Mobile number is already registered';
      }

      if (Object.keys(errors).length > 0) {
        return NextResponse.json({
          message: 'Validation failed',
          errors
        }, { status: 400 });
      }
    }

    // Get the pending status ID
    const pendingStatus = await db.collection('statuses').findOne({ name: 'pending' });
    if (!pendingStatus) {
      return NextResponse.json({
        message: 'System configuration error',
        errors: { general: 'Pending status not found' }
      }, { status: 500 });
    }

    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create the user document
    const userDocument = {
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      email: email.toLowerCase().trim(),
      username: username.toLowerCase().trim(),
      password: password, // Store raw password as requested
      hashedpassword: hashedPassword, // Store hashed password for authentication
      gender,
      mobile: mobile.trim(),
      roleId: new ObjectId(roleId),
      statusId: pendingStatus._id,
      approvedAt: null,
      approvedBy: null,
      createdAt: new Date().toISOString(),
      requestedAt: new Date().toISOString()
    };

    // Insert the user
    const result = await db.collection('users').insertOne(userDocument);

    return NextResponse.json({
      message: 'Registration successful. Please wait for admin approval.',
      userId: result.insertedId
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({
      message: 'Server error during registration',
      errors: { general: 'An unexpected error occurred. Please try again.' }
    }, { status: 500 });
  }
}