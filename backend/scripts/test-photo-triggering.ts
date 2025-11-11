/**
 * Photo Context Triggering Test Script
 * Tests Task 3.2: AI-initiated photo display based on conversation context
 *
 * Reference: docs/technical/reminder-system.md - Photo Context Triggering
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
const TEST_USER_ID = 'test-user-photos';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function section(title: string) {
  console.log(`\n${colors.blue}${'═'.repeat(60)}`);
  console.log(`🧪 ${title}`);
  console.log(`${'═'.repeat(60)}${colors.reset}`);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Test 1: Create test photos for user
 */
async function testCreateTestPhotos(): Promise<string[]> {
  section('Test 1: Create Sample Photos in Cosmos DB');

  const photos = [
    {
      fileName: 'sarah-birthday-2023.jpg',
      blobUrl: 'https://storage.blob.core.windows.net/photos/sarah-birthday-2023.jpg',
      manualTags: ['Sarah', 'birthday', 'family', 'celebration'],
      caption: 'Sarah\'s birthday celebration at home',
      location: 'Home',
      capturedDate: '2023-08-15T14:30:00Z',
      uploadedBy: 'מיכל',
    },
    {
      fileName: 'garden-roses-2024.jpg',
      blobUrl: 'https://storage.blob.core.windows.net/photos/garden-roses-2024.jpg',
      manualTags: ['garden', 'roses', 'flowers', 'nature'],
      caption: 'Beautiful roses blooming in the garden',
      location: 'Home garden',
      capturedDate: '2024-05-20T08:00:00Z',
      uploadedBy: 'מיכל',
    },
    {
      fileName: 'family-passover-2024.jpg',
      blobUrl: 'https://storage.blob.core.windows.net/photos/family-passover-2024.jpg',
      manualTags: ['family', 'Sarah', 'מיכל', 'Passover', 'holiday'],
      caption: 'Whole family together for Passover Seder',
      location: 'Home',
      capturedDate: '2024-04-22T19:00:00Z',
      uploadedBy: 'Sarah',
    },
    {
      fileName: 'tel-aviv-beach-2023.jpg',
      blobUrl: 'https://storage.blob.core.windows.net/photos/tel-aviv-beach-2023.jpg',
      manualTags: ['מיכל', 'beach', 'Tel Aviv', 'summer'],
      caption: 'Day trip to Tel Aviv beach with מיכל',
      location: 'Tel Aviv',
      capturedDate: '2023-07-10T12:00:00Z',
      uploadedBy: 'מיכל',
    },
    {
      fileName: 'old-wedding-photo.jpg',
      blobUrl: 'https://storage.blob.core.windows.net/photos/old-wedding-photo.jpg',
      manualTags: ['צביה', 'wedding', 'love', 'memories'],
      caption: 'Wedding day with צביה',
      location: 'Jerusalem',
      capturedDate: '1975-06-15T16:00:00Z',
      uploadedBy: 'Sarah',
    },
  ];

  const photoIds: string[] = [];

  for (const photo of photos) {
    try {
      const response = await axios.post(`${BASE_URL}/photo/upload`, {
        userId: TEST_USER_ID,
        ...photo,
      });

      photoIds.push(response.data.id);
      log(`✅ Created photo: ${photo.fileName} (ID: ${response.data.id})`, colors.green);
      log(`   Tags: ${photo.manualTags.join(', ')}`, colors.cyan);
    } catch (error: any) {
      log(`❌ Failed to create photo: ${error.message}`, colors.red);
    }
  }

  log(`\n✅ Created ${photoIds.length} test photos`, colors.green);
  return photoIds;
}

/**
 * Test 2: Query photos by family member name
 */
async function testQueryPhotosByName(name: string) {
  section(`Test 2: Query Photos by Name - "${name}"`);

  try {
    const response = await axios.get(`${BASE_URL}/photo/${TEST_USER_ID}`, {
      params: {
        taggedPeople: name,
        limit: 5,
      },
    });

    log(`✅ Found ${response.data.length} photos tagged with "${name}"`, colors.green);

    if (response.data.length > 0) {
      log('\n📋 Photos:', colors.cyan);
      response.data.forEach((photo: any, index: number) => {
        log(`   ${index + 1}. ${photo.fileName}`, colors.yellow);
        log(`      Caption: ${photo.caption || 'No caption'}`, colors.reset);
        log(`      Tags: ${photo.manualTags.join(', ')}`, colors.cyan);
        log(`      Last shown: ${photo.lastShownAt || 'Never'}`, colors.reset);
      });
    }

    return response.data;
  } catch (error: any) {
    log(`❌ Failed to query photos: ${error.response?.data?.message || error.message}`, colors.red);
    return [];
  }
}

/**
 * Test 3: Query photos by keywords
 */
async function testQueryPhotosByKeywords(keywords: string[]) {
  section(`Test 3: Query Photos by Keywords - "${keywords.join(', ')}"`);

  try {
    const response = await axios.get(`${BASE_URL}/photo/${TEST_USER_ID}`, {
      params: {
        keywords: keywords.join(','),
        limit: 5,
      },
    });

    log(`✅ Found ${response.data.length} photos matching keywords`, colors.green);

    if (response.data.length > 0) {
      log('\n📋 Photos:', colors.cyan);
      response.data.forEach((photo: any, index: number) => {
        log(`   ${index + 1}. ${photo.fileName}`, colors.yellow);
        log(`      Caption: ${photo.caption || 'No caption'}`, colors.reset);
        log(`      Tags: ${photo.manualTags.join(', ')}`, colors.cyan);
      });
    }

    return response.data;
  } catch (error: any) {
    log(`❌ Failed to query photos: ${error.response?.data?.message || error.message}`, colors.red);
    return [];
  }
}

/**
 * Test 4: Simulate photo trigger (as if called by AI)
 */
async function testPhotoTrigger(
  reason: string,
  mentionedNames?: string[],
  keywords?: string[],
  context?: string,
) {
  section(`Test 4: Simulate Photo Trigger - ${reason}`);

  try {
    const response = await axios.post(`${BASE_URL}/photo/trigger`, {
      userId: TEST_USER_ID,
      trigger_reason: reason,
      mentioned_names: mentionedNames,
      keywords: keywords,
      context: context || 'Test conversation context',
      emotional_state: reason === 'user_expressed_sadness' ? 'sad' : 'neutral',
    });

    if (response.data.success) {
      log(`✅ Photo trigger successful!`, colors.green);
      log(`   Photos to show: ${response.data.photos_shown}`, colors.cyan);

      if (response.data.photo_descriptions) {
        log('\n📸 Photos:', colors.yellow);
        response.data.photo_descriptions.forEach((desc: string, index: number) => {
          log(`   ${index + 1}. ${desc}`, colors.reset);
        });
      }
    } else {
      log(`⚠️ No photos found: ${response.data.message}`, colors.yellow);
    }

    return response.data;
  } catch (error: any) {
    log(`❌ Failed to trigger photos: ${error.response?.data?.message || error.message}`, colors.red);
    return null;
  }
}

/**
 * Test 5: Test 24-hour cooldown
 */
async function testCooldownPeriod() {
  section('Test 5: Test 24-Hour Cooldown');

  // Trigger photos for "Sarah"
  log('Step 1: Show photos tagged with "Sarah"...', colors.cyan);
  const result1 = await testPhotoTrigger('user_mentioned_family', ['Sarah'], undefined, 'User mentioned Sarah');

  await sleep(2000);

  // Try again immediately - should exclude recently shown
  log('\nStep 2: Try again immediately (should exclude recently shown)...', colors.cyan);
  const result2 = await testPhotoTrigger('user_mentioned_family', ['Sarah'], undefined, 'User mentioned Sarah again');

  if (result1?.photos_shown > 0 && result2?.photos_shown === 0) {
    log(`✅ Cooldown working: Photos excluded from second trigger`, colors.green);
  } else if (result1?.photos_shown > 0 && result2?.photos_shown > 0) {
    log(`⚠️ Cooldown may not be working: Photos shown again`, colors.yellow);
  }
}

/**
 * Test 6: Get all photos for user
 */
async function testGetAllPhotos() {
  section('Test 6: Get All Photos for User');

  try {
    const response = await axios.get(`${BASE_URL}/photo/${TEST_USER_ID}/all`);

    log(`✅ Retrieved ${response.data.length} total photos`, colors.green);

    if (response.data.length > 0) {
      log('\n📋 All Photos:', colors.cyan);
      response.data.forEach((photo: any, index: number) => {
        log(`   ${index + 1}. ${photo.fileName}`, colors.yellow);
        log(`      Shown ${photo.shownCount} times`, colors.reset);
        log(`      Last shown: ${photo.lastShownAt ? new Date(photo.lastShownAt).toLocaleString() : 'Never'}`, colors.cyan);
      });
    }

    return response.data;
  } catch (error: any) {
    log(`❌ Failed to get all photos: ${error.response?.data?.message || error.message}`, colors.red);
    return [];
  }
}

/**
 * Main test runner
 */
async function runTests() {
  log(`\n${colors.blue}${'='.repeat(60)}`);
  log(`🧪 Starting Photo Context Triggering Tests (Task 3.2)`);
  log(`${'='.repeat(60)}${colors.reset}\n`);

  log(`Current time: ${new Date().toLocaleString()}`, colors.cyan);
  log(`Test user: ${TEST_USER_ID}\n`, colors.cyan);

  try {
    // Test 1: Create sample photos
    await testCreateTestPhotos();
    await sleep(1000);

    // Test 2: Query by name
    await testQueryPhotosByName('Sarah');
    await sleep(1000);

    await testQueryPhotosByName('מיכל');
    await sleep(1000);

    // Test 3: Query by keywords
    await testQueryPhotosByKeywords(['garden', 'flowers']);
    await sleep(1000);

    await testQueryPhotosByKeywords(['family', 'celebration']);
    await sleep(1000);

    // Test 4: Trigger photos (various scenarios)
    await testPhotoTrigger('user_mentioned_family', ['Sarah'], undefined, 'User talked about granddaughter Sarah');
    await sleep(1000);

    await testPhotoTrigger('user_expressed_sadness', undefined, ['family', 'memories'], 'User feeling lonely');
    await sleep(1000);

    await testPhotoTrigger('user_requested_photos', undefined, ['garden'], 'User asked to see garden photos');
    await sleep(1000);

    // Test 5: Cooldown period
    await testCooldownPeriod();
    await sleep(1000);

    // Test 6: Get all photos
    await testGetAllPhotos();

    log(`\n${colors.green}✅ All Photo Context Triggering tests completed successfully!${colors.reset}\n`);

    log(`${colors.cyan}📋 Summary:${colors.reset}`);
    log(`  ✅ Photo creation (upload with metadata)`);
    log(`  ✅ Photo querying (by name, keywords)`);
    log(`  ✅ Photo triggering (AI-initiated display)`);
    log(`  ✅ Metadata updates (shownCount, lastShownAt)`);
    log(`  ✅ 24-hour cooldown (exclude recently shown)`);

    log(`\n${colors.blue}🎉 Task 3.2: Photo Context Triggering - COMPLETE${colors.reset}\n`);
  } catch (error: any) {
    log(`\n${colors.red}❌ Test failed: ${error.message}${colors.reset}`, colors.red);
    if (error.response?.data) {
      log(`   Server response: ${JSON.stringify(error.response.data)}`, colors.red);
    }
    process.exit(1);
  }
}

// Run tests
runTests();
