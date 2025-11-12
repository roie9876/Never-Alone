import { NextRequest, NextResponse } from 'next/server';
import { BlobServiceClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';

// Initialize Azure Blob Storage client with Azure AD authentication
const credential = new DefaultAzureCredential();
const accountName = process.env.BLOB_STORAGE_ACCOUNT_NAME || 'neveralone';
const blobServiceClient = new BlobServiceClient(
  `https://${accountName}.blob.core.windows.net`,
  credential
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; blobName: string }> }
) {
  try {
    const { userId, blobName } = await params;

    // Get container and blob clients
    const containerClient = blobServiceClient.getContainerClient('photos');
    const blobPath = `${userId}/${blobName}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobPath);

    // Download blob
    const downloadResponse = await blockBlobClient.download();
    
    if (!downloadResponse.readableStreamBody) {
      return NextResponse.json(
        { error: 'Failed to download photo' },
        { status: 500 }
      );
    }

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of downloadResponse.readableStreamBody) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    // Return image with appropriate content type
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': downloadResponse.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Photo fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photo' },
      { status: 500 }
    );
  }
}
