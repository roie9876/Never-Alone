import { NextRequest, NextResponse } from 'next/server';
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';

// Authenticate user from token
function authenticateUser(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  try {
    // Decode base64 token (format: JSON with email, userId, etc.)
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const tokenData = JSON.parse(decoded);
    
    if (!tokenData.email) {
      return null;
    }
    
    return tokenData.email;
  } catch (error) {
    console.error('Token decode error:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // No authentication required - use default user for MVP
    const userId = 'user-tiferet-001';

    // Connect to Cosmos DB using Azure AD
    const credential = new DefaultAzureCredential();
    const client = new CosmosClient({
      endpoint: process.env.COSMOS_ENDPOINT!,
      aadCredentials: credential,
    });

    const database = client.database('never-alone');

    // Query conversations from lowercase container (has full transcripts)
    const conversationsContainer = database.container('conversations');
    const { resources: conversations } = await conversationsContainer.items
      .query({
        query: `
          SELECT * FROM c 
          WHERE c.userId = @userId 
          ORDER BY c.startedAt DESC
        `,
        parameters: [{ name: '@userId', value: userId }],
      })
      .fetchAll();

    return NextResponse.json({
      conversations: conversations,
      total: conversations.length,
    });

  } catch (error) {
    console.error('Error loading conversations:', error);
    return NextResponse.json(
      { error: 'Failed to load conversations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
