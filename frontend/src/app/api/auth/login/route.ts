// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/json-db-manager';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();
    
    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }
    
    // Find or create user
    let user = db.getUserByEmail(email);
    
    if (!user) {
      const userId = crypto.randomUUID();
      user = db.createUser(userId, email, name);
    }
    
    // Create session
    const session = db.createSession(user.id, 24); // 24 hours
    
    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set('session_id', session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    });
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}