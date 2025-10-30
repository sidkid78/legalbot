import { NextRequest, NextResponse } from 'next/server';
import { getLegalGoogleGenAIClient } from '@/lib/legal/google-genai-client';

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json();
    
    if (!content) {
      return NextResponse.json(
        { error: 'Query content is required' },
        { status: 400 }
      );
    }
    
    console.log('Legal analysis request:', {
      contentLength: content.length,
      timestamp: new Date().toISOString()
    });
    
    // Use the official Google GenAI SDK
    const client = getLegalGoogleGenAIClient();
    const analysis = await client.analyzeLegalQuery(content);
    
    console.log('Legal analysis completed:', analysis);
    
    return NextResponse.json({
      domain: analysis.domain,
      jurisdiction: analysis.jurisdiction,
      urgency: analysis.urgency,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning
    });
    
  } catch (error) {
    console.error('Legal analysis error:', error);
    
    let errorMessage = 'Failed to analyze legal query';
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'Gemini API key not configured properly';
      } else if (error.message.includes('403')) {
        errorMessage = 'Gemini API access denied';
      } else if (error.message.includes('429')) {
        errorMessage = 'Gemini API rate limit exceeded';
      } else {
        errorMessage = `Analysis error: ${error.message}`;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Legal Analysis API is running',
    status: 'OK',
    timestamp: new Date().toISOString(),
    geminiConfigured: !!process.env.GEMINI_API_KEY
  });
}