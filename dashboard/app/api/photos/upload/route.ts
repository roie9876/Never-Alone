import { NextRequest, NextResponse } from 'next/server';
import { BlobServiceClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import type { Photo } from '@/types/onboarding';

// Initialize Azure Blob Storage client with Azure AD authentication
const credential = new DefaultAzureCredential();
const accountName = process.env.BLOB_STORAGE_ACCOUNT_NAME || 'neveralone';
const blobServiceClient = new BlobServiceClient(
  `https://${accountName}.blob.core.windows.net`,
  credential
);

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Max size: 5MB' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      );
    }

    // Generate unique blob name: {userId}/{timestamp}-{filename}
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const blobName = `${userId}/${timestamp}-${sanitizedFileName}`;

    // Get container client
    const containerClient = blobServiceClient.getContainerClient('photos');
    
    // Ensure container exists (private access - account-level public access is disabled)
    await containerClient.createIfNotExists();

    // Get blob client
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Azure Blob Storage
    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: {
        blobContentType: file.type,
      },
    });

    // Generate proxied URL (since storage account has public access disabled)
    // Format: /api/photos/{userId}/{timestamp}-{filename}
    const blobUrl = `/api/photos/${userId}/${timestamp}-${sanitizedFileName}`;

    // Create Photo object
    const photo: Photo = {
      id: `photo-${timestamp}`,
      fileName: file.name,
      blobUrl: blobUrl,
      uploadedAt: new Date().toISOString(),
      manualTags: [],
      size: file.size,
    };

    return NextResponse.json(photo, { status: 200 });
  } catch (error) {
    console.error('Photo upload error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload photo',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
