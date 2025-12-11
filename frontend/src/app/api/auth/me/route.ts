import { db } from "@/lib/database/json-db-manager";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// app/api/auth/me/route.ts
export async function GET(req: NextRequest) {
    console.log('Me request received', req);
    try {
      const cookieStore = await cookies();
      const sessionId = await cookieStore.get('session_id')?.value;
      
      if (!sessionId) {
        const response = await NextResponse.json(
          { error: 'Not authenticated' },
          { status: 401 }
        );
        console.log('Not authenticated:', response);
        return response;
      }
      
      const session = db.getSession(sessionId);
      console.log('Session:', session);
      if (!session) {
        const response = await NextResponse.json(
          { error: 'Session expired' },
          { status: 401 }
        );
        console.log('Session expired:', response);
        return response;
      }
      
      const user = db.getUserById(session.user_id);
      console.log('User:', user);
      if (!user) {
        const response = await NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
        console.log('User not found:', response);
        return response;
      }
      
      console.log('User found:', user);
      const response = await NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      });
      console.log('User found:', response);
      return response;
    } catch (error) {
      console.error('Auth check error:', error);
      const response = await NextResponse.json(
        { error: 'Authentication check failed' },
        { status: 500 }
      );
      console.log('Auth check error:', response);
      return response;
    }
  }