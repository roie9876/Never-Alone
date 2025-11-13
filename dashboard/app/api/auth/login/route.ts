import { NextRequest, NextResponse } from 'next/server';
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';

// Initialize Cosmos DB client with Azure AD authentication
const credential = new DefaultAzureCredential();
const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  aadCredentials: credential,
});

const database = cosmosClient.database('never-alone');
const container = database.container('FamilyMembers');

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'חובה למלא אימייל וסיסמה' },
        { status: 400 }
      );
    }

    // Query for family member by email
    const querySpec = {
      query: 'SELECT * FROM FamilyMembers f WHERE f.email = @email',
      parameters: [{ name: '@email', value: email.toLowerCase() }],
    };

    const { resources } = await container.items.query(querySpec).fetchAll();

    if (resources.length === 0) {
      return NextResponse.json(
        { error: 'אימייל או סיסמה שגויים' },
        { status: 401 }
      );
    }

    const familyMember = resources[0];

    // MVP: Simple password comparison (plaintext - NOT recommended for production!)
    // TODO Post-MVP: Use bcrypt for password hashing
    if (familyMember.password !== password) {
      return NextResponse.json(
        { error: 'אימייל או סיסמה שגויים' },
        { status: 401 }
      );
    }

    // Generate simple JWT-like token (MVP approach)
    // TODO Post-MVP: Use proper JWT library with signing
    const token = Buffer.from(
      JSON.stringify({
        id: familyMember.id,
        email: familyMember.email,
        userId: familyMember.userId,
        timestamp: Date.now(),
      })
    ).toString('base64');

    // Update last login time
    await container.item(familyMember.id, familyMember.userId).patch([
      {
        op: 'replace',
        path: '/lastLoginAt',
        value: new Date().toISOString(),
      },
    ]);

    return NextResponse.json({
      success: true,
      token,
      name: familyMember.name,
      userId: familyMember.userId,
      relationship: familyMember.relationship,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'שגיאת שרת פנימית' },
      { status: 500 }
    );
  }
}
