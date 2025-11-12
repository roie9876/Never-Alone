# Photo Upload Testing Guide

**Date:** November 12, 2025  
**Dashboard:** http://localhost:3000  
**Status:** ✅ Dashboard running

---

## 🧪 Test Scenarios

### Test 1: Basic Photo Upload ✅

**Steps:**
1. Open http://localhost:3000
2. Click "Load Tiferet Data" (pre-filled form)
3. Navigate through steps to Step 7: Family Photos (תמונות משפחה)
4. Drag & drop 1 photo OR click to select
5. Wait for upload progress bar
6. Verify photo preview appears
7. Add names in Hebrew: "צביה, מיכל, רחלי"
8. Add caption (optional): "חוף בתל אביב 2024"
9. Continue to Review & Confirm
10. Submit form

**Expected Results:**
- ✅ Photo uploads to Azure Blob Storage
- ✅ Preview shows image
- ✅ Tags save correctly
- ✅ Form submission includes photos array
- ✅ Cosmos DB document has photos field

---

### Test 2: Multiple Photos Upload

**Steps:**
1. Navigate to Step 7: Family Photos
2. Select multiple photos (3-5 at once)
3. Verify all upload simultaneously with progress bars
4. Tag each photo with different names
5. Add captions to each

**Expected Results:**
- ✅ All photos upload successfully
- ✅ Preview grid shows all photos
- ✅ Each photo has unique tags/captions

---

### Test 3: File Validation

**Steps:**
1. Try uploading a 6MB+ file
2. Try uploading a PDF or non-image file
3. Try uploading 21 photos (exceeds limit)

**Expected Results:**
- ❌ Large files rejected with alert
- ❌ Non-image files rejected
- ❌ 21st photo rejected (max 20)

---

### Test 4: Photo Removal

**Steps:**
1. Upload 3 photos
2. Click red X button on middle photo
3. Verify photo removed from grid
4. Submit form
5. Verify only 2 photos in Cosmos DB

**Expected Results:**
- ✅ Photo removed from UI
- ✅ Photo not included in submission

---

### Test 5: Optional Field (No Photos)

**Steps:**
1. Complete entire onboarding form
2. Skip Step 7 (don't upload any photos)
3. Submit form

**Expected Results:**
- ✅ Form submits successfully
- ✅ Photos array is empty in Cosmos DB
- ✅ No errors

---

### Test 6: Azure Blob Storage URLs

**Steps:**
1. Upload 1 photo
2. Copy blob URL from Network tab (DevTools)
3. Open URL in new browser tab

**Expected Results:**
- ✅ URL format: `https://neveralone.blob.core.windows.net/photos/{userId}/{timestamp}-{filename}`
- ✅ Image displays when URL opened directly
- ✅ Public read access works

---

## 🔍 How to Test

### Quick Test (5 minutes):
```bash
# 1. Dashboard is already running at http://localhost:3000
# 2. Open in browser
# 3. Click "Load Tiferet Data"
# 4. Navigate to Step 7
# 5. Upload 1 test photo
# 6. Add tags: "צביה, מיכל"
# 7. Submit form
```

### Full Test (15 minutes):
- Run all 6 test scenarios above
- Check Cosmos DB for saved photos
- Verify blob URLs are accessible
- Test with different image formats (JPG, PNG, GIF)

---

## 📊 Debugging

### Check Cosmos DB:
```bash
cd backend
node scripts/check-containers.js
# Look for photos array in safety-config documents
```

### Check Network Requests:
1. Open DevTools → Network tab
2. Upload photo
3. Look for:
   - `POST /api/photos/upload` (should return 200)
   - Response has `blobUrl` field
   - `POST /api/onboarding` (includes photos array)

### Check Console Logs:
- Dashboard logs upload progress
- API logs show blob storage operations
- Look for errors in both

---

## ✅ Success Criteria

- [ ] Can upload 1 photo successfully
- [ ] Photo preview displays correctly
- [ ] Manual tags save properly
- [ ] Optional caption saves
- [ ] Can remove photos
- [ ] Form submits with photos array
- [ ] Blob URLs are accessible
- [ ] Works without photos (optional field)
- [ ] File validation works (size, type limits)
- [ ] Hebrew UI displays correctly

---

## 🐛 Potential Issues

### Issue 1: Azure AD Authentication Error
**Symptom:** Upload fails with 401/403  
**Solution:** Ensure Azure AD credentials configured for Blob Storage

### Issue 2: Container Not Found
**Symptom:** Upload fails with 404  
**Solution:** API creates container automatically, check Azure portal

### Issue 3: CORS Error
**Symptom:** Browser blocks blob URL access  
**Solution:** Blob container has public read access, should work

### Issue 4: File Too Large
**Symptom:** Upload hangs or fails  
**Solution:** Check file size < 5MB, compress if needed

---

## 📸 Test Photos

Use these test photos:
- Family photo (< 5MB)
- Portrait photo
- Group photo
- Landscape photo

**Suggested tags:**
- "צביה" (Tsviah - wife)
- "מיכל" (Michal - daughter)
- "רחלי" (Racheli - daughter)
- "משפחה" (family)

---

## 🎯 Next Steps After Testing

1. Document test results
2. Fix any bugs found
3. Update TASK_5.4_PHOTO_UPLOAD.md with test results
4. Move to next Phase 2 feature (Crisis Detection or Music Selection)

---

**Ready to test!** Open http://localhost:3000 and try uploading a photo! 📷
