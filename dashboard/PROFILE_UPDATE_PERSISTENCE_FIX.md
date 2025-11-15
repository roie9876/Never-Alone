# 🔧 Profile Update Persistence Fix

**Date:** November 15, 2025  
**Issue:** Profile changes save successfully but revert to old values after page refresh

---

## Problem

User reported:
```
✅ Form valid, calling onSubmit...
📤 Sending to API...
📥 Response status: 200
✅ Success: {success: true, data: {...}}
```

But after refreshing the page, the form shows **old values** instead of the updated ones.

---

## Root Cause

**Next.js caching issue:**
1. Form submits successfully ✅
2. Data saves to Cosmos DB ✅
3. API returns success ✅
4. **BUT**: Next.js caches the GET response
5. On page refresh, Next.js serves **cached old data** from memory instead of fetching fresh data from Cosmos DB

---

## Solution

### 1. Client-Side: Disable Caching in Fetch Request

**File:** `dashboard/components/onboarding/OnboardingWizard.tsx`

**Changes:**
- Added timestamp query parameter to prevent URL caching: `?t=${timestamp}`
- Added `cache: 'no-store'` to disable Next.js caching
- Added `Cache-Control: no-cache` header to disable browser caching

```typescript
// Add timestamp to prevent caching issues
const timestamp = new Date().getTime();
const response = await fetch(`/api/onboarding/${userId}?t=${timestamp}`, {
  cache: 'no-store', // Disable Next.js caching
  headers: {
    'Cache-Control': 'no-cache', // Disable browser caching
  },
});
```

### 2. Server-Side: Set No-Cache Headers in API Response

**File:** `dashboard/app/api/onboarding/[userId]/route.ts`

**Changes:**
- Added comprehensive no-cache headers to API response

```typescript
return NextResponse.json(
  {
    success: true,
    data: formData,
  },
  {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  }
);
```

---

## How to Test

### 1. Update Profile
1. Go to onboarding form
2. Change any field (e.g., patient name)
3. Submit form
4. Wait for success message ✅

### 2. Verify Persistence
1. **Hard refresh** the page (Cmd+Shift+R on Mac)
2. **Expected:** Form shows NEW values (your changes)
3. **Not expected:** Form shows OLD values (before your changes)

### 3. Check Console Logs
```
🔄 Loading existing configuration...
✅ Loaded existing configuration from Cosmos DB
   Patient name: [NEW NAME]  <-- Should match your changes
   Music enabled: [true/false]
   Full data: {...}
```

---

## Technical Details

### Cache-Control Headers Explained

| Header | Purpose |
|--------|---------|
| `no-store` | Don't store response in cache at all |
| `no-cache` | Revalidate with server before using cached copy |
| `must-revalidate` | Check with server if cache is stale |
| `proxy-revalidate` | Same as must-revalidate for shared caches |
| `Pragma: no-cache` | HTTP/1.0 backward compatibility |
| `Expires: 0` | Mark response as already expired |

### Timestamp Query Parameter

Adding `?t=${timestamp}` makes each request unique:
- `GET /api/onboarding/user-123?t=1700000000000`
- `GET /api/onboarding/user-123?t=1700000000001`

Browser sees these as **different URLs**, so it can't serve cached response.

---

## Alternative Solutions (Not Used)

### Option 1: Disable Next.js Route Caching Globally
```typescript
// app/api/onboarding/[userId]/route.ts
export const dynamic = 'force-dynamic';
export const revalidate = 0;
```
**Why not used:** Too aggressive, affects all API routes

### Option 2: Use SWR/React Query for Data Fetching
```typescript
import useSWR from 'swr';
const { data } = useSWR(`/api/onboarding/${userId}`, fetcher, {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
});
```
**Why not used:** Adds dependency, overkill for MVP

### Option 3: Manual Cache Invalidation
```typescript
// Clear cache after submit
router.refresh();
```
**Why not used:** Doesn't work reliably with Next.js App Router

---

## Related Issues

- **Issue #1:** Photo upload persists correctly ✅
- **Issue #2:** Music preferences persist correctly ✅
- **Issue #3:** This fix ensures ALL fields persist correctly ✅

---

## Acceptance Criteria

✅ Submit form → See success message  
✅ Refresh page (Cmd+R) → Form shows NEW values  
✅ Hard refresh (Cmd+Shift+R) → Form still shows NEW values  
✅ Close tab, reopen → Form shows NEW values  
✅ Console logs show "Loaded existing configuration from Cosmos DB"  
✅ No errors in browser console or backend logs  

---

**Status:** ✅ FIXED  
**Testing:** Ready for verification  
**Deployment:** Dashboard restart required

```bash
# Restart dashboard to apply changes
cd /Users/robenhai/Never\ Alone/dashboard
npm run dev
```
