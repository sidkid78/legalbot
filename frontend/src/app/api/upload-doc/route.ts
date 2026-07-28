import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Read the file stream into a buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save it to a temporary file locally so the SDK can read it
    const tempPath = join(tmpdir(), `${Date.now()}-${file.name}`);
    await writeFile(tempPath, buffer);

    try {
      // Initialize Gemini Client
      const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!key) {
        throw new Error('Google GenAI API key is required.');
      }
      
      const client = new GoogleGenAI({ apiKey: key });
      
      // Upload file to Gemini
      console.log(`Uploading ${file.name} to Gemini...`);
      const uploadResult = await client.files.upload({
        file: tempPath,
        config: {
          mimeType: file.type || 'application/pdf',
        }
      });
      
      console.log(`Uploaded ${file.name} successfully. URI: ${uploadResult.uri}`);

      // We can also retrieve the file metadata to get the name, but uploadResult should have it
      return NextResponse.json({
        success: true,
        document: {
          uri: uploadResult.uri,
          mimeType: file.type || 'application/pdf',
          name: uploadResult.name // The name assigned by the Gemini API
        }
      });
    } finally {
      // Ensure the temporary file is deleted even if the upload fails
      try {
        await unlink(tempPath);
      } catch (err) {
        console.error('Failed to delete temporary file', err);
      }
    }
  } catch (error) {
    console.error('Error in document upload:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error during upload' },
      { status: 500 }
    );
  }
}
