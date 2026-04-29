import { getDb } from '../lib/mongodb.js';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const db = await getDb();

    // Test user data
    const testUser = {
      firstname: 'Test',
      lastname: 'User',
      email: 'test@example.com',
      username: 'testuser',
      password: 'TestPass123!',
      gender: 'male',
      mobile: '9876543210',
      roleId: '69e4a6c8de63c192b8d65e53', // user role
      statusId: '69ec9846e302dc5b974ac3cb' // pending status
    };

    // Check if test user already exists
    const existingUser = await db.collection('users').findOne({
      $or: [
        { username: testUser.username },
        { email: testUser.email },
        { mobile: testUser.mobile }
      ]
    });

    if (existingUser) {
      return Response.json({
        message: 'Test user already exists',
        user: existingUser
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(testUser.password, saltRounds);

    // Create test user
    const userDocument = {
      ...testUser,
      hashedpassword: hashedPassword,
      approvedAt: null,
      approvedBy: null,
      createdAt: new Date().toISOString(),
      requestedAt: new Date().toISOString()
    };

    const result = await db.collection('users').insertOne(userDocument);

    return Response.json({
      message: 'Test user created successfully',
      userId: result.insertedId,
      user: userDocument
    });

  } catch (error) {
    console.error('Test user creation error:', error);
    return Response.json({
      message: 'Error creating test user',
      error: error.message
    }, { status: 500 });
  }
}