import { db } from "@/lib/database/json-db-manager";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// app/api/auth/logout/route.ts
export async function POST(req: NextRequest) {
    console.log('Logout request received', req);
    try {
      const cookieStore = await cookies();
      const sessionId = await cookieStore.get('session_id')?.value;
      
      console.log('Session ID:', sessionId);
      
      if (sessionId) {
        db.deleteSession(sessionId);
      }
      
      // Clear session cookie
      await cookieStore.delete('session_id');
      console.log('Session cookie deleted');
      return NextResponse.json({ success: true });
      
    } catch (error) {
      console.error('Logout error:', error);
      return NextResponse.json(
        { error: 'Logout failed' },
        { status: 500 }
      );
    }
  }
  