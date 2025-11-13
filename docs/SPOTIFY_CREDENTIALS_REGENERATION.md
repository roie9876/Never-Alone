# 🔐 URGENT: Spotify Credentials Regeneration Guide

**Date:** November 12, 2025  
**Priority:** 🚨 HIGH - Credentials exposed on GitHub  
**Time Required:** 10 minutes

---

## ⚠️ What Happened

The file `backend/SPOTIFY_PREMIUM_VERIFIED.md` was committed to GitHub with **actual Spotify API credentials**:
- ❌ Client ID: `62cf510d89384d389dfb26a6cb2f1bda`
- ❌ Client Secret: `288e106571a74b959050389ac5ff4a93`
- ❌ Access Token (user-specific)
- ❌ Refresh Token (permanent)

**Risk Level:** MEDIUM
- Client ID/Secret can be used by others to make API calls on your behalf
- Access/Refresh tokens give access to your Spotify account
- No financial risk (Spotify API is free for Premium users)
- Potential abuse: rate limiting, API quota exhaustion

---

## ✅ Immediate Action Required

### Step 1: Regenerate Client Credentials (5 minutes)

1. **Visit Spotify Developer Dashboard:**
   ```
   https://developer.spotify.com/dashboard
   ```

2. **Login with your account:**
   - Email: `roie9876@gmail.com`

3. **Find your app:**
   - Should be named something like "Never Alone" or similar

4. **Reset Client Secret:**
   - Click on your app
   - Click "Settings" (top-right)
   - Scroll to "Client Secret"
   - Click "Show Client Secret"
   - Click "Reset" button (confirms you want new secret)
   - **COPY THE NEW SECRET IMMEDIATELY** (can't view again!)

5. **Copy New Client ID:**
   - While on Settings page
   - Copy the new Client ID (shown at top)

---

### Step 2: Update Backend .env File (2 minutes)

```bash
cd /Users/robenhai/Never\ Alone/backend

# Open .env file
nano .env

# Find these lines:
SPOTIFY_CLIENT_ID=62cf510d89384d389dfb26a6cb2f1bda
SPOTIFY_CLIENT_SECRET=288e106571a74b959050389ac5ff4a93

# Replace with NEW credentials:
SPOTIFY_CLIENT_ID=<paste_new_client_id>
SPOTIFY_CLIENT_SECRET=<paste_new_client_secret>

# KEEP the existing Access Token and Refresh Token (user-specific):
SPOTIFY_ACCESS_TOKEN=BQDBk6-A_TuUl6KMcaspuV2_tMdBRq8f5penLnKp4GECd2YEgaVn22YLbgdd2tIvzp3YmfeHf3XcJ2V0surW-I7Qb_K1VSvZOvLRKEgmROiOBeWOp6EIs4aUM7l_IFSKEhxzZTDTX1jB23o0KrPFuzgQEpOzrryV_tklzyzwYyfStry1eEbdZ_mdVFr1PCEZD_b-i0c1eMCb7jglgec5vQsRE9hY_WjEpVgglY2-9B56iRx7ivYsJqN79Czoc2y87ON_-Fbghio
SPOTIFY_REFRESH_TOKEN=AQCTuLHTCvVyqgbbXGOCSul8NiJSGwn4zg20VRfpWNC9CGTtWUJWluSGBIQFHF1L7llUwK8FJs3-uXUerIkORsEh83gFnGHYn64WUwLZhkd8nZ5qz8ih6yHM52F1c-kdDCU

# Save and exit (Ctrl+X, Y, Enter)
```

---

### Step 3: Test New Credentials (3 minutes)

```bash
cd /Users/robenhai/Never\ Alone/backend

# Test Spotify search with new credentials
node scripts/test-spotify.js

# Expected output:
# ✅ Spotify authentication successful
# ✅ Search results: [song list]

# If you see errors:
# - Double-check you copied credentials correctly
# - Verify no extra spaces in .env file
# - Try regenerating again
```

---

## 🔐 Security Best Practices Going Forward

### ✅ DO:
- Keep `.env` file in `.gitignore` (already done ✅)
- Use placeholders in documentation (`<your_client_id>`)
- Store secrets in Azure Key Vault (production)
- Rotate credentials every 90 days

### ❌ DON'T:
- Never commit `.env` files to Git
- Never put credentials in markdown files
- Never share credentials in Slack/Discord
- Never hardcode credentials in source code

---

## 📋 Verification Checklist

After regenerating credentials:

- [ ] New Client ID saved to `backend/.env`
- [ ] New Client Secret saved to `backend/.env`
- [ ] Old credentials deleted from `backend/.env`
- [ ] Test script runs successfully (`test-spotify.js`)
- [ ] Flutter app can still play music
- [ ] No credentials in `SPOTIFY_PREMIUM_VERIFIED.md` (already fixed)
- [ ] `.env` file NOT staged in Git (`git status` shows it ignored)

---

## 🤔 FAQ

### Q: Do I need to re-authenticate my Spotify account?
**A:** No. Access Token and Refresh Token are user-specific and still valid. Only the app credentials (Client ID/Secret) need regeneration.

### Q: Will this break existing functionality?
**A:** No. The backend will automatically use the new credentials. No code changes needed.

### Q: What if someone already used the old credentials?
**A:** Once you regenerate, old credentials become invalid. Monitor your Spotify Developer Dashboard for unusual API usage.

### Q: Should I delete the GitHub commit history?
**A:** Not necessary. Regenerating credentials invalidates the old ones. Rewriting Git history is complex and can cause issues with collaborators.

### Q: How often should I rotate credentials?
**A:** Best practice: Every 90 days, or immediately after exposure (like now).

---

## 🆘 Troubleshooting

### Error: "Invalid client credentials"
**Solution:** 
```bash
# Verify .env file has no extra spaces:
cat backend/.env | grep SPOTIFY_CLIENT

# Should look like:
SPOTIFY_CLIENT_ID=abc123def456
SPOTIFY_CLIENT_SECRET=xyz789uvw012
```

### Error: "Refresh token expired"
**Solution:**
```bash
# Re-run OAuth flow to get new refresh token:
cd backend
node scripts/verify-spotify-premium.js

# Follow browser prompts to re-authenticate
# New tokens will be saved to .env
```

### Error: "Cannot find module 'spotify-web-api-node'"
**Solution:**
```bash
cd backend
npm install
```

---

## ✅ Completion Confirmation

Once you've completed all steps, update this section:

```
✅ Regeneration completed on: [DATE]
✅ New Client ID: [First 8 characters only, e.g., "abc12345..."]
✅ Test passed: [Yes/No]
✅ Flutter app working: [Yes/No]
```

---

**Estimated Time:** 10 minutes  
**Difficulty:** Easy  
**Impact:** High security improvement  
**Status:** ⏳ WAITING FOR ACTION

---

**Start now: https://developer.spotify.com/dashboard** 🚀
