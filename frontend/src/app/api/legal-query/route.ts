// app/api/legal-query/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/sqlite-manager';
import { getBackendLegalClient } from '@/lib/legal/backend-client';
import { cookies } from 'next/headers';
import { 
  LegalQuery, 
  LegalDomain, 
  JurisdictionType, 
  LegalUrgency 
} from '@/lib/legal/types';

// Helper function to get current user
async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;
  
  if (!sessionId) {
    return null;
  }
  
  const session = db.getSession(sessionId);
  if (!session) {
    return null;
  }
  
  return db.getUserById(session.user_id);
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    
    if (!user) {
      const response = await NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
      console.log('Unauthorized:', response);
      return response;
    }

    const data = await req.json();
    
    // Validate the query
    if (!data.content) {
      const response = await NextResponse.json(
        { error: 'Query content is required' },
        { status: 400 }
      );
      console.log('Query content is required:', response);
      return response;
    }
    
    // Validate domain
    if (!Object.values(LegalDomain).includes(data.domain)) {
      const response = await NextResponse.json(
        { error: 'Invalid legal domain' },
        { status: 400 }
      );
      console.log('Invalid legal domain:', response);
      return response;
    }
    
    // Validate jurisdiction
    if (!Object.values(JurisdictionType).includes(data.jurisdiction)) {
      const response = await NextResponse.json(
        { error: 'Invalid jurisdiction' },
        { status: 400 }
      );
      console.log('Invalid jurisdiction:', response);
      return response;
    }
    
    // Validate urgency
    if (!Object.values(LegalUrgency).includes(data.urgency)) {
      const response = await NextResponse.json(
        { error: 'Invalid urgency level' },
        { status: 400 }
      );
      console.log('Invalid urgency level:', response);
      return response;
    }
    
    // Build the legal query
    const query: LegalQuery = {
      content: data.content,
      domain: data.domain,
      jurisdiction: data.jurisdiction,
      urgency: data.urgency,
      priority: data.priority || 3,
      requiresResearch: data.requiresResearch || true,
      clientInfo: data.clientInfo || {
        name: 'Confidential Client',
        matterNumber: `M-${Date.now()}`
      },
      relatedCases: data.relatedCases,
      deadline: data.deadline,
      billable: data.billable !== undefined ? data.billable : true,
      timestamp: new Date().toISOString(),
      maxTokens: data.maxTokens || 2048,
      temperature: data.temperature || 0.3,
      userId: user.id
    };
    
    // Save query to database
    const queryId = db.createLegalQuery(query);
    query.id = queryId;
    
    // Use backend client for processing (if backend is available)
    const useBackend = process.env.USE_BACKEND === 'true';
    
    if (useBackend) {
      // Process with Python backend
      try {
        const backendClient = getBackendLegalClient();
        const backendResponse = await backendClient.processLegalQuery(query);
        
        // Save the response to database
        db.createLegalResponse(backendResponse);
        
        // Update query status
        db.updateLegalQueryStatus(queryId, 'completed');
        
        return NextResponse.json({
          success: true,
          message: 'Legal query processed successfully',
          queryId,
          response: backendResponse
        });
      } catch (backendError) {
        console.error('Backend processing failed:', backendError);
        
        // Fall back to local processing
        console.log('Falling back to local processing...');
      }
    }
    
    // Local processing with Google GenAI (fallback or primary)
    try {
      const { getLegalWorkflowService } = await import('@/lib/legal/legal-workflow');
      const workflowService = getLegalWorkflowService();
      const taskId = workflowService.addTask(query);
      
      // Process the task
      const response = await workflowService.processNextTask();
      
      if (response) {
        // Save the response to database
        db.createLegalResponse(response);
        
        // Update query status
        db.updateLegalQueryStatus(queryId, 'completed');
        
        return NextResponse.json({
          success: true,
          message: 'Legal query processed successfully',
          queryId,
          taskId,
          response
        });
      } else {
        // Update query status to error
        db.updateLegalQueryStatus(queryId, 'error', 'Processing failed');
        
        return NextResponse.json(
          { error: 'Failed to process legal query' },
          { status: 500 }
        );
      }
      
    } catch (localError) {
      console.error('Local processing failed:', localError);
      
      // Update query status to error
      db.updateLegalQueryStatus(queryId, 'error', localError instanceof Error ? localError.message : 'Unknown error');
      
      return NextResponse.json(
        { error: 'Failed to process legal query' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error submitting legal query:', error);
    return NextResponse.json(
      { error: 'Failed to process legal query' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get queries for the user
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const queries = db.getLegalQueriesByUser(user.id, limit);
    
    // Get responses for completed queries
    const queriesWithResponses = queries.map(query => {
      const response = query.status === 'completed' ? db.getLegalResponse(query.id) : null;
      return {
        ...query,
        response
      };
    });
    
    const response = await NextResponse.json(queriesWithResponses);
    console.log('Legal queries fetched successfully:', response);
    return response;
  } catch (error) {
    console.error('Error fetching legal queries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch queries' },
      { status: 500 }
    );
  }
}