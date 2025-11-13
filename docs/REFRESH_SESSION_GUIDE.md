# 🔄 Refresh Active Session - Quick Guide

## בעיה: שינויים בפרופיל לא משפיעים על שיחה פעילה

**תסריט:**
1. משתמש משנה העדפות מוזיקה ב-Dashboard (למשל: מוחק "נעמי שמר")
2. השינויים נשמרים ב-Cosmos DB ✅
3. אבל ה-AI באפליקציה עדיין מציע את "נעמי שמר" ❌

**סיבה:** System prompt (הוראות ל-AI) נטען פעם אחת בתחילת השיחה, ולא מתעדכן.

---

## פתרון: Refresh System Prompt

### אופציה 1: שימוש בסקריפט (הכי קל)

```bash
cd backend
node refresh-active-session.js
```

הסקריפט יזהה אוטומטית את ה-session הפעיל וירענן אותו.

**תוצאה צפויה:**
```
🔄 Refresh System Prompt Script
================================

No sessionId provided. Looking for active sessions...

Found 1 active session(s):

1. Session ID: session-abc-123
   User ID: user-tiferet-001
   Status: active
   Started: 11/11/2025, 10:30:00 AM

Using session: session-abc-123

🔄 Sending refresh request to: http://localhost:3000/realtime/session/session-abc-123/refresh
Response status: 200

✅ SUCCESS!
System prompt refreshed successfully. New preferences will take effect immediately.

💡 The AI will now use updated music preferences in the conversation.
   You can continue talking - the changes are already active!
```

---

### אופציה 2: שימוש ב-curl

```bash
# שלב 1: מצא את ה-session ID
curl http://localhost:3000/realtime/sessions

# שלב 2: רענן את ה-session
curl -X POST http://localhost:3000/realtime/session/<SESSION_ID>/refresh
```

---

## דוגמה מלאה: מחיקת אמן מרשימת ההעדפות

### שלב 1: תיעוד המצב הנוכחי
```bash
# בדוק את ההעדפות הנוכחיות ב-Cosmos DB
# (דרך Azure Portal או Dashboard)

# הפעל שיחה באפליקציה
cd frontend_flutter
flutter run -d macos

# בשיחה, אמור: "תנגן לי מוזיקה"
# תוצאה: AI מציע "נעמי שמר" ✅
```

### שלב 2: שינוי ההעדפות
```bash
# פתח Dashboard
cd dashboard
npm run dev

# עבור ל: http://localhost:3001/dashboard
# 1. לחץ "עריכת פרופיל"
# 2. עבור לשלב 9: Music Preferences
# 3. מחק "נעמי שמר" מרשימת האמנים
# 4. לחץ "שלח והשלם"
# 5. וודא שהשמירה הצליחה
```

### שלב 3: רענן את ה-session הפעיל
```bash
cd backend
node refresh-active-session.js
```

### שלב 4: בדוק שהשינוי חל
```bash
# חזור לאפליקציה (השיחה עדיין רצה - אל תסגור!)
# אמור שוב: "תנגן לי מוזיקה"

# ✅ תוצאה צפויה: AI לא מציע "נעמי שמר"
# ✅ תוצאה צפויה: AI מציע רק אמנים אחרים (למשל "אריק איינשטיין")
```

---

## Endpoints חדשים

### 1. GET /realtime/sessions
מחזיר רשימה של כל ה-sessions הפעילים.

```bash
curl http://localhost:3000/realtime/sessions
```

**תגובה:**
```json
{
  "sessions": [
    {
      "id": "session-abc-123",
      "userId": "user-tiferet-001",
      "conversationId": "conv-xyz",
      "status": "active",
      "startedAt": "2025-11-11T10:30:00.000Z",
      "turnCount": 12,
      "tokenUsage": 3456
    }
  ]
}
```

### 2. POST /realtime/session/:sessionId/refresh
מרענן את ה-system prompt עבור session ספציפי.

```bash
curl -X POST http://localhost:3000/realtime/session/session-abc-123/refresh
```

**תגובה (הצלחה):**
```json
{
  "success": true,
  "message": "System prompt refreshed successfully. New preferences will take effect immediately."
}
```

**תגובה (שגיאה):**
```json
{
  "statusCode": 500,
  "message": "Session session-abc-123 not found"
}
```

---

## טיפים לפתרון בעיות

### בעיה: "Session not found"
**סיבה:** Session ID לא קיים או שהשיחה כבר נסגרה.

**פתרון:**
1. בדוק אם יש sessions פעילים: `curl http://localhost:3000/realtime/sessions`
2. אם אין - התחל שיחה חדשה באפליקציה
3. נסה שוב עם session ID נכון

### בעיה: "WebSocket not connected"
**סיבה:** ה-WebSocket נסגר (למשל, אם סגרת את האפליקציה).

**פתרון:**
1. פתח מחדש את האפליקציה
2. התחל שיחה חדשה
3. נסה שוב

### בעיה: השינויים לא חלים
**בדיקות:**
1. וודא שהשינויים נשמרו ב-Cosmos DB:
   ```bash
   # בדוק logs בזמן שמירה
   # צריך לראות: "Music preferences saved for user..."
   ```

2. וודא שה-refresh הצליח:
   ```bash
   # בדוק backend logs
   # צריך לראות:
   # 🔄 Refreshing system prompt for session: ...
   # ✅ Music preferences reloaded for user ...
   # ✅ System prompt refreshed for session ...
   ```

3. וודא ש-AI קיבל את ההוראות החדשות:
   ```bash
   # בדוק WebSocket logs
   # צריך לראות: session.update message sent
   ```

---

## אינטגרציה עתידית

### Dashboard - רענון אוטומטי
בעתיד, ה-Dashboard ירענן אוטומטית את ה-sessions הפעילים אחרי שמירה:

```typescript
// In OnboardingWizard.tsx
const onSubmit = async (data) => {
  // 1. Save profile
  await saveProfile(data);
  
  // 2. Get active sessions
  const { sessions } = await fetch('/realtime/sessions').then(r => r.json());
  
  // 3. Refresh all active sessions
  for (const session of sessions.filter(s => s.userId === userId)) {
    await fetch(`/realtime/session/${session.id}/refresh`, { method: 'POST' });
  }
  
  alert('פרופיל נשמר והאפליקציה עודכנה!');
};
```

### Flutter - מעקב אחרי Session ID
בעתיד, אפליקציית Flutter תשמור את ה-session ID ל-Dashboard:

```dart
// In conversation_screen.dart
void _startConversation() async {
  final session = await conversationManager.startConversation();
  
  // Store session ID for Dashboard access
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString('activeSessionId', session.id);
}
```

---

## קבצים רלוונטיים

**Backend:**
- `/backend/src/services/realtime.service.ts` - Logic ראשי
- `/backend/src/controllers/realtime.controller.ts` - REST endpoints
- `/backend/refresh-active-session.js` - סקריפט עזר

**תיעוד:**
- `/SYSTEM_PROMPT_REFRESH_COMPLETE.md` - תיעוד מלא

---

**סטטוס:** ✅ קוד מוכן, ⏳ ממתין לבדיקות  
**עודכן:** 11 בנובמבר 2025  
**פעולה הבאה:** הרץ בדיקות עם שיחה פעילה
