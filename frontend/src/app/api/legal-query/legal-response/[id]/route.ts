import { NextRequest, NextResponse } from 'next/server';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Create Supabase client for authentication
    const supabase = createServerActionClient({ cookies });
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    
    // Verify that the query belongs to the user
    const { data: query, error: queryError } = await supabase
      .from('legal_queries')
      .select('user_id')
      .eq('id', id)
      .single();
      
    if (queryError || !query) {
      return NextResponse.json(
        { error: 'Query not found' },
        { status: 404 }
      );
    }
    
    if (query.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Get the response by query ID
    const { data: response, error: responseError } = await supabase
      .from('legal_responses')
      .select('*')
      .eq('query_id', id)
      .single();
    
    if (responseError) {
      if (responseError.code === 'PGRST116') {
        // No rows found
        return NextResponse.json(
          { error: 'Response not found or still processing' },
          { status: 404 }
        );
      }
      
      console.error('Error fetching legal response:', responseError);
      return NextResponse.json(
        { error: 'Failed to fetch legal response' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching legal response:', error);
    return NextResponse.json(
      { error: 'Failed to fetch legal response' },
      { status: 500 }
    );
  }
}