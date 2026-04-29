import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  try {
    console.log('Attempting login for username:', username);
    const db = await getDb();
    console.log('DB connected');

    const user = await db.collection('users').findOne({ username });
    console.log('User found:', !!user);
    if (!user) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.hashedpassword);
    console.log('Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // Fetch status
    const status = await db.collection('statuses').findOne({ _id: user.statusId });
    console.log('Status found:', !!status, status?.name);
    if (!status || status.name !== 'approved') {
      return NextResponse.json({ message: 'Account not approved' }, { status: 403 });
    }

    // Fetch role
    const role = await db.collection('roles').findOne({ _id: user.roleId });
    console.log('Role found:', !!role, role?.name);
console.log("role", role);
    // Generate JWT
    const token = jwt.sign(
      {
        _id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        username: user.username,
        role: role ? role.name : 'user',
        statusId: user.statusId,
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    return NextResponse.json({ message: 'Login successful', token });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}