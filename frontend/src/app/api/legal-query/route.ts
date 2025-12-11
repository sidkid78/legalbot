// app/api/legal-query/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/json-db-manager';
import { 
  LegalQuery, 
  LegalDomain, 
  JurisdictionType, 
  LegalUrgency 
} from '@/lib/legal/types';

export async function POST(req: NextRequest) {
  try {
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
      userId: 'default-user' // No authentication needed
    };
    
    // Save query to database
    const queryId = db.createLegalQuery(query);
    query.id = queryId;
    
    // Process with Google GenAI (no backend needed)
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
    // Get queries (no authentication needed)
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const queries = db.getLegalQueriesByUser('default-user', limit);
    
    // Get responses for completed queries
    const queriesWithResponses = queries.map(query => {
      const response = query.status === 'completed' ? db.getLegalResponse(query.id || '') : null;
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