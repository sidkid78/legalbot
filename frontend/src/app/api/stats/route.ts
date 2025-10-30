import { db } from "@/lib/database/sqlite-manager";
import { NextResponse } from "next/server";

// app/api/stats/route.ts
export async function GET() {
    try {
      const stats = db.getStats();
      
      // Clean up expired sessions
      const expiredSessions = db.cleanupExpiredSessions();
      
      return NextResponse.json({
        ...stats,
        expiredSessionsCleanedUp: expiredSessions,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      return NextResponse.json(
        { error: 'Failed to fetch statistics' },
        { status: 500 }
      );
    }
  }