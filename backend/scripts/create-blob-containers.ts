/**
 * Create Blob Storage Containers
 * Creates audio-files and photos containers with Azure AD authentication
 */

import { BlobServiceClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🗂️  Creating Blob Storage Containers');
  console.log('=====================================\n');

  const storageAccountName = process.env.BLOB_STORAGE_ACCOUNT_NAME || 'neveralone';
  const credential = new DefaultAzureCredential();
  const blobServiceUrl = `https://${storageAccountName}.blob.core.windows.net`;

  console.log(`Storage Account: ${storageAccountName}`);
  console.log(`URL: ${blobServiceUrl}\n`);

  const blobServiceClient = new BlobServiceClient(blobServiceUrl, credential);

  // Create audio-files container
  console.log('Creating container: audio-files');
  const audioContainer = blobServiceClient.getContainerClient('audio-files');
  const audioExists = await audioContainer.exists();

  if (audioExists) {
    console.log('✅ Container "audio-files" already exists\n');
  } else {
    await audioContainer.create({ access: 'blob' });
    console.log('✅ Container "audio-files" created (public blob access)\n');
  }

  // Create photos container
  console.log('Creating container: photos');
  const photosContainer = blobServiceClient.getContainerClient('photos');
  const photosExists = await photosContainer.exists();

  if (photosExists) {
    console.log('✅ Container "photos" already exists\n');
  } else {
    await photosContainer.create({ access: 'blob' });
    console.log('✅ Container "photos" created (public blob access)\n');
  }

  console.log('✨ Blob container setup complete!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
