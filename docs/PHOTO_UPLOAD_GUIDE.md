# 📸 Photo Upload Guide - Testing with Real Photos

## Current Status
✅ Backend running with `/photo/bulk` endpoint
✅ Dashboard configured to sync photos to Cosmos DB
✅ Ready to upload real photos under Tiferet's profile

---

## Step-by-Step: Upload Real Photos

### 1. Start the Dashboard
```bash
cd "/Users/robenhai/Never Alone/dashboard"
npm run dev
```
**URL**: http://localhost:3000

### 2. Navigate to Photo Upload
- Open browser: http://localhost:3000/onboarding
- Click through steps until **Step 8: Family Photos**

### 3. Upload Your Photos
1. **Drag & drop** or **click to select** photos from your computer
2. For each photo, add:
   - **Caption** (Hebrew or English): Brief description
   - **Tags**: Family member names (e.g., "מיכל", "תפארת", "צביה")
   - **Location** (optional): Where the photo was taken
   
**Example:**
```
Photo 1:
  Caption: "תפארת וצביה בחופש באילת"
  Tags: תפארת, צביה, Tiferet, Tzvia
  Location: אילת

Photo 2:
  Caption: "מיכל ורחלי עם הנכדים בפורים"
  Tags: מיכל, רחלי, Michal, Racheli
  Location: תל אביב
```

### 4. Complete the Form
- Continue to **Step 9: Review**
- Click **"Submit Onboarding"**
- Wait for success message

### 5. Verify Photos Saved to Cosmos DB
```bash
# Check backend logs
tail -20 /tmp/never-alone-backend.log

# Query photos from Cosmos DB
curl -s http://localhost:3000/photo/user-tiferet-001 | jq '.[] | {id, caption, tags: .manualTags}'
```

**Expected output:**
```json
{
  "id": "photo-xxx-xxx",
  "caption": "תפארת וצביה בחופש באילת",
  "tags": ["תפארת", "צביה", "Tiferet", "Tzvia"]
}
```

---

## Test AI Photo Triggering

### 1. Start Flutter App
```bash
cd "/Users/robenhai/Never Alone/frontend_flutter"
flutter run -d macos
```

### 2. Start a Conversation
Say one of these phrases (Hebrew):

**Option 1 - Direct Request:**
```
"אני אשמח לראות תמונות של בני המשפחה שלי"
(I'd like to see family photos)
```

**Option 2 - Mention Specific Person:**
```
"תראה לי תמונות של מיכל"
(Show me photos of Michal)

"איך נראית צביה?"
(How does Tzvia look?)
```

**Option 3 - Emotional Trigger:**
```
"אני מרגיש בודד היום"
(I feel lonely today)
```

### 3. Expected AI Behavior
1. AI recognizes photo trigger (name mention or emotion)
2. Calls `show_photos()` function
3. Backend queries Cosmos DB for matching photos
4. Photos appear in Flutter app overlay
5. AI says: "הנה כמה תמונות של מיכל" (Here are some photos of Michal)

### 4. Check Backend Logs
```bash
tail -f /tmp/never-alone-backend.log
```

**Look for:**
```
✅ Found 3 photos for user user-tiferet-001
📷 Broadcasting 3 photos to session xyz
```

---

## Troubleshooting

### Photos Not Appearing in AI Conversation

**Check 1: Photos in Cosmos DB?**
```bash
curl http://localhost:3000/photo/user-tiferet-001
```
- If empty: Dashboard didn't sync photos to backend
- Solution: Check dashboard console for errors during form submission

**Check 2: Tags Match Conversation?**
- AI searches by tags (manualTags field)
- If you mention "מיכל" but photo is tagged "Michal" only → Won't match
- **Solution**: Add BOTH Hebrew and English tags:
  ```
  Tags: מיכל, Michal, Daughter, בת
  ```

**Check 3: Backend Running?**
```bash
curl http://localhost:3000/health
```
- Should return: `{"status":"ok"}`

**Check 4: Backend Logs**
```bash
tail -50 /tmp/never-alone-backend.log
```
- Look for "show_photos function called"
- Look for "Found X photos"
- Look for any errors

### Dashboard Photo Upload Fails

**Check 1: Azure Blob Storage**
- Dashboard uploads to: `neveralone.blob.core.windows.net/photos`
- Check Azure Portal: Storage Account → Containers → photos

**Check 2: Backend URL**
```bash
# Verify .env.local has correct backend URL
cat dashboard/.env.local | grep BACKEND_URL
```
Should show: `BACKEND_URL=http://localhost:3000`

---

## Photo Data Flow

```
📱 User uploads photo in dashboard
    ↓
🔵 Photo → Azure Blob Storage (file storage)
    ↓
📋 Dashboard → calls → http://localhost:3000/photo/bulk
    ↓
🗄️ Backend → saves metadata → Cosmos DB photos container
    ↓
🤖 AI conversation → mentions family name
    ↓
🔍 Backend queries Cosmos DB by tags
    ↓
📸 Photos displayed in Flutter app
```

---

## Clean Up Old Test Photos (Optional)

If you want to remove the fake test photos first:

```bash
# Delete all test photos
cd "/Users/robenhai/Never Alone/backend"
node -e "
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

const client = new CosmosClient({
  endpoint: 'https://neveralone.documents.azure.com:443/',
  aadCredentials: new DefaultAzureCredential()
});

const container = client.database('never-alone').container('photos');

async function deleteTestPhotos() {
  const { resources } = await container.items
    .query('SELECT * FROM c WHERE c.userId = \"user-tiferet-001\"')
    .fetchAll();
  
  console.log(\`Found \${resources.length} photos to delete\`);
  
  for (const photo of resources) {
    await container.item(photo.id, photo.userId).delete();
    console.log(\`Deleted: \${photo.id}\`);
  }
  
  console.log('✅ All test photos deleted');
}

deleteTestPhotos();
"
```

---

## Summary

1. ✅ Backend has `/photo/bulk` endpoint
2. ✅ Dashboard syncs photos to Cosmos DB on form submission
3. ✅ Photos tagged with Hebrew/English names
4. ✅ AI queries photos by tags during conversation
5. ✅ Flutter app displays photos in overlay

**Next**: Upload 3-5 real family photos with proper tags, then test in AI conversation!
