# 🗄️ Azure Cosmos DB Design

## Overview

Never Alone uses **Azure Cosmos DB** as its primary database for storing user data, conversations, memories, reminders, and safety incidents. Cosmos DB was chosen for its:

- **Low latency**: Global distribution with <10ms reads/writes
- **Flexible schema**: NoSQL documents adapt to evolving patient data
- **Azure integration**: Native integration with Azure OpenAI, Speech Services
- **Real-time updates**: Change feed for family dashboard notifications
- **Compliance**: Built-in TTL for GDPR/HIPAA retention policies
- **Vector search**: Semantic memory retrieval (future feature)

---

## Account Configuration

**Account Name:** `never-alone-prod`  
**API:** NoSQL (Core SQL API)  
**Consistency Level:** Session (balance between consistency and performance)  
**Multi-region:** 
- Primary: Israel Central (low latency for Israeli users)
- Secondary: West Europe (failover)
- Future: US East (for US expansion)

**Backup:**
- Continuous backup mode (point-in-time restore)
- 30-day retention

---

## Database Structure

### Database: `NeverAloneDB`

**Containers:**

1. **Users** - User profiles and family configuration
2. **Conversations** - Full conversation history with TTL
3. **UserMemories** - Long-term facts and preferences
4. **Reminders** - Medication and activity reminders
5. **SafetyIncidents** - Safety alerts and logs (7-year retention)
6. **Photos** - Photo metadata with Azure Blob URLs

---

## Container Designs

### 1. Users Container

**Partition Key:** `/userId`  
**Throughput:** 400 RU/s (autoscale to 4000 RU/s)  
**TTL:** Off (permanent storage)

**Document Structure:**
```json
{
  "id": "user_12345",
  "userId": "user_12345",
  "type": "user_profile",
  "personalInfo": {
    "name": "תפארת",
    "age": 78,
    "language": "he",
    "timezone": "Asia/Jerusalem"
  },
  "cognitiveMode": "dementia",
  "familyMembers": [
    {
      "name": "צביה",
      "relationship": "spouse",
      "phone": "+972-50-xxx-xxxx",
      "isPrimaryContact": true
    },
    {
      "name": "מיכל",
      "relationship": "daughter",
      "phone": "+972-52-xxx-xxxx",
      "isPrimaryContact": false
    }
  ],
  "safetyRules": {
    "neverAllow": [
      {
        "rule": "leaving_home_alone",
        "reason": "Busy highway nearby, disorientation risk"
      },
      {
        "rule": "using_stove",
        "reason": "Forgot pot on stove twice, burn risk"
      },
      {
        "rule": "climbing_stairs_alone",
        "reason": "Fall risk, weak knees"
      }
    ],
    "redirectToFamily": [
      "any_kitchen_activity",
      "leaving_current_room",
      "requests_to_find_missing_person"
    ],
    "approvedActivities": [
      "sitting_in_enclosed_garden",
      "listening_to_cantorial_music",
      "looking_at_family_photos",
      "seated_breathing_exercises"
    ]
  },
  "preferences": {
    "favoriteMusic": ["cantorial", "classical"],
    "hobbies": ["reading", "gardening"],
    "dailyRoutine": {
      "wakeTime": "07:00",
      "bedTime": "21:30",
      "mealtimes": ["08:00", "13:00", "19:00"]
    }
  },
  "medicalInfo": {
    "allergies": ["penicillin"],
    "conditions": ["dementia", "high_blood_pressure"],
    "medications": [
      {
        "name": "Blue pill",
        "dosage": "10mg",
        "schedule": "08:00",
        "notes": "Take with food"
      },
      {
        "name": "Small white pill",
        "dosage": "5mg",
        "schedule": "14:00",
        "notes": "Take with water"
      }
    ]
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-11-09T10:00:00Z",
  "_ts": 1699524000
}
```

**Indexing Policy:**
```json
{
  "indexingMode": "consistent",
  "automatic": true,
  "includedPaths": [
    { "path": "/userId/?" },
    { "path": "/familyMembers/*/phone/?" },
    { "path": "/createdAt/?" }
  ],
  "excludedPaths": [
    { "path": "/safetyRules/*" },
    { "path": "/preferences/*" }
  ]
}
```

---

### 2. Conversations Container

**Partition Key:** `/userId`  
**Throughput:** 1000 RU/s (autoscale to 10000 RU/s)  
**TTL:** Enabled (default: 7776000 seconds = 90 days)

**Document Structure:**
```json
{
  "id": "conv_2024-11-09_10-30_user_12345",
  "userId": "user_12345",
  "type": "conversation",
  "conversationId": "conv_xyz",
  "startTime": "2024-11-09T10:30:00Z",
  "endTime": "2024-11-09T10:45:00Z",
  "turns": [
    {
      "turnId": 1,
      "timestamp": "2024-11-09T10:30:00Z",
      "speaker": "user",
      "transcript": "אני לא מוצא את צביה",
      "audioUrl": "https://neveralone.blob.core.windows.net/audio/conv_xyz_turn_1.opus",
      "emotion": {
        "primary": "anxiety",
        "confidence": 0.85,
        "scores": {
          "joy": 0.1,
          "sadness": 0.3,
          "anxiety": 0.85,
          "anger": 0.05
        }
      }
    },
    {
      "turnId": 2,
      "timestamp": "2024-11-09T10:30:02Z",
      "speaker": "ai",
      "response": "בוא נתקשר לצביה עכשיו כדי לראות איפה היא",
      "audioUrl": "https://neveralone.blob.core.windows.net/audio/conv_xyz_turn_2.opus",
      "promptUsed": "You are a compassionate AI companion...",
      "llmModel": "gpt-5",
      "tokensUsed": 150,
      "latencyMs": 850,
      "safetyCheckPassed": true
    },
    {
      "turnId": 3,
      "timestamp": "2024-11-09T10:30:15Z",
      "speaker": "user",
      "transcript": "אולי אצא לחפש אותה בחוץ?",
      "audioUrl": "https://neveralone.blob.core.windows.net/audio/conv_xyz_turn_3.opus",
      "emotion": {
        "primary": "worry",
        "confidence": 0.92,
        "scores": {
          "anxiety": 0.92,
          "sadness": 0.4
        }
      }
    },
    {
      "turnId": 4,
      "timestamp": "2024-11-09T10:30:17Z",
      "speaker": "ai",
      "response": "אני מבין שאתה דואג, אבל בוא נשאל את מיכל קודם",
      "audioUrl": "https://neveralone.blob.core.windows.net/audio/conv_xyz_turn_4.opus",
      "promptUsed": "...",
      "llmModel": "gpt-5",
      "tokensUsed": 180,
      "latencyMs": 920,
      "safetyCheckPassed": true,
      "safetyRuleTriggered": "leaving_home_alone",
      "familyAlerted": true,
      "alertDetails": {
        "alertId": "alert_abc",
        "severity": "critical",
        "sentTo": ["צביה", "מיכל"],
        "sentAt": "2024-11-09T10:30:18Z"
      }
    }
  ],
  "summary": "User couldn't find spouse and wanted to go outside. AI redirected to family and sent alert.",
  "durationSeconds": 900,
  "totalTurns": 12,
  "safetyIncidents": 1,
  "ttl": 7776000,
  "_ts": 1699524000
}
```

**Indexing Policy:**
```json
{
  "indexingMode": "consistent",
  "includedPaths": [
    { "path": "/userId/?" },
    { "path": "/startTime/?" },
    { "path": "/turns/*/timestamp/?" },
    { "path": "/turns/*/safetyRuleTriggered/?" }
  ],
  "excludedPaths": [
    { "path": "/turns/*/audioUrl/?" },
    { "path": "/turns/*/promptUsed/?" }
  ]
}
```

---

### 3. UserMemories Container

**Partition Key:** `/userId`  
**Throughput:** 400 RU/s (autoscale to 2000 RU/s)  
**TTL:** Off (permanent)

**Document Structure:**
```json
{
  "id": "memory_abc",
  "userId": "user_12345",
  "type": "user_memory",
  "memoryType": "personal_fact",
  "category": "family",
  "key": "daughter_name",
  "value": "Sarah",
  "context": "Learned from conversation on 2024-01-15",
  "source": "conversation",
  "confidenceScore": 0.95,
  "embedding": [0.123, 0.456, ...],  // Vector for semantic search (future)
  "createdAt": "2024-01-15T14:20:00Z",
  "lastAccessed": "2024-11-09T10:30:00Z",
  "accessCount": 47,
  "_ts": 1699524000
}
```

**Memory Types:**
- `personal_fact` - Names, birthdays, family relationships
- `medical_info` - Allergies, conditions, medications
- `preference` - Favorite activities, music, topics
- `life_history` - Career, hometown, major life events
- `routine` - Daily habits, meal times, sleep patterns

**Indexing Policy:**
```json
{
  "indexingMode": "consistent",
  "includedPaths": [
    { "path": "/userId/?" },
    { "path": "/memoryType/?" },
    { "path": "/category/?" },
    { "path": "/lastAccessed/?" }
  ],
  "vectorIndexes": [
    {
      "path": "/embedding",
      "type": "quantizedFlat"
    }
  ]
}
```

---

### 4. Reminders Container

**Partition Key:** `/userId`  
**Throughput:** 400 RU/s (autoscale to 2000 RU/s)  
**TTL:** Off (permanent until deleted)

**Document Structure:**
```json
{
  "id": "reminder_def",
  "userId": "user_12345",
  "type": "reminder",
  "reminderType": "medication",
  "schedule": {
    "time": "08:00",
    "timezone": "Asia/Jerusalem",
    "recurrence": "daily",
    "daysOfWeek": ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
  },
  "status": "active",
  "medication": {
    "name": "Blue pill",
    "dosage": "10mg",
    "notes": "Take with food"
  },
  "confirmationLogs": [
    {
      "date": "2024-11-09",
      "scheduledTime": "08:00:00",
      "confirmedAt": "08:02:15",
      "userQuote": "Yes, I took it",
      "audioUrl": "https://...",
      "confirmationMethod": "verbal",
      "familyNotified": false
    },
    {
      "date": "2024-11-08",
      "scheduledTime": "08:00:00",
      "confirmedAt": null,
      "missedAlert": true,
      "familyNotified": true,
      "familyNotifiedAt": "08:05:00"
    }
  ],
  "createdAt": "2024-01-01T00:00:00Z",
  "createdBy": "family_member_michal",
  "updatedAt": "2024-11-09T08:02:15Z",
  "_ts": 1699524000
}
```

**Indexing Policy:**
```json
{
  "indexingMode": "consistent",
  "includedPaths": [
    { "path": "/userId/?" },
    { "path": "/reminderType/?" },
    { "path": "/schedule/time/?" },
    { "path": "/status/?" }
  ]
}
```

---

### 5. SafetyIncidents Container

**Partition Key:** `/userId`  
**Throughput:** 400 RU/s (autoscale to 2000 RU/s)  
**TTL:** 220752000 seconds (7 years for legal compliance)

**Document Structure:**
```json
{
  "id": "incident_ghi",
  "userId": "user_12345",
  "type": "safety_incident",
  "timestamp": "2024-11-09T17:32:00Z",
  "incidentType": "unsafe_physical_movement",
  "severity": "critical",
  "context": {
    "conversationId": "conv_xyz",
    "turnId": 4,
    "userRequest": "אולי אצא לחפש את צביה בחוץ?",
    "aiResponse": "אני מבין שאתה דואג, אבל בוא נשאל את מיכל קודם",
    "audioUrl": "https://neveralone.blob.core.windows.net/audio/incident_ghi.opus"
  },
  "safetyRule": {
    "ruleId": "leaving_home_alone",
    "ruleName": "Never allow leaving home alone",
    "configuredBy": "family",
    "reason": "Busy highway nearby, disorientation risk"
  },
  "familyNotification": {
    "notified": true,
    "recipients": [
      {
        "name": "צביה",
        "phone": "+972-50-xxx-xxxx",
        "notificationMethod": "sms",
        "sentAt": "2024-11-09T17:32:05Z",
        "acknowledged": true,
        "acknowledgedAt": "2024-11-09T17:34:20Z"
      },
      {
        "name": "מיכל",
        "phone": "+972-52-xxx-xxxx",
        "notificationMethod": "push",
        "sentAt": "2024-11-09T17:32:05Z",
        "acknowledged": true,
        "acknowledgedAt": "2024-11-09T17:35:10Z"
      }
    ]
  },
  "resolution": {
    "resolved": true,
    "resolvedAt": "2024-11-09T17:40:00Z",
    "resolvedBy": "צביה",
    "notes": "Called patient, he is calm now, I'm on my way home"
  },
  "exportedForLegal": false,
  "ttl": 220752000,
  "_ts": 1699524000
}
```

**Indexing Policy:**
```json
{
  "indexingMode": "consistent",
  "includedPaths": [
    { "path": "/userId/?" },
    { "path": "/timestamp/?" },
    { "path": "/severity/?" },
    { "path": "/incidentType/?" },
    { "path": "/safetyRule/ruleId/?" }
  ]
}
```

---

### 6. Photos Container

**Partition Key:** `/userId`  
**Throughput:** 400 RU/s (autoscale to 2000 RU/s)  
**TTL:** Off (permanent)

**Document Structure:**
```json
{
  "id": "photo_jkl",
  "userId": "user_12345",
  "type": "photo",
  "blobUrl": "https://neveralone.blob.core.windows.net/photos/user_12345/photo_jkl.jpg",
  "thumbnailUrl": "https://neveralone.blob.core.windows.net/photos/user_12345/thumb_photo_jkl.jpg",
  "caption": "Family dinner at Sarah's house",
  "peopleTagged": ["Sarah", "צביה", "grandchildren"],
  "uploadedBy": "family_member_michal",
  "uploadDate": "2024-06-15T18:00:00Z",
  "context": "Summer 2024 family gathering",
  "viewCount": 23,
  "lastViewed": "2024-11-09T15:20:00Z",
  "_ts": 1699524000
}
```

---

## Query Patterns

### Common Queries

**1. Get user profile:**
```sql
SELECT * FROM c WHERE c.userId = 'user_12345' AND c.type = 'user_profile'
```

**2. Get today's conversations:**
```sql
SELECT * FROM c 
WHERE c.userId = 'user_12345' 
  AND c.type = 'conversation'
  AND c.startTime >= '2024-11-09T00:00:00Z'
  AND c.startTime < '2024-11-10T00:00:00Z'
ORDER BY c.startTime DESC
```

**3. Get recent safety incidents:**
```sql
SELECT * FROM c 
WHERE c.userId = 'user_12345' 
  AND c.type = 'safety_incident'
  AND c.severity = 'critical'
ORDER BY c.timestamp DESC
OFFSET 0 LIMIT 10
```

**4. Get active reminders:**
```sql
SELECT * FROM c 
WHERE c.userId = 'user_12345' 
  AND c.type = 'reminder'
  AND c.status = 'active'
```

**5. Search memories by category:**
```sql
SELECT * FROM c 
WHERE c.userId = 'user_12345' 
  AND c.type = 'user_memory'
  AND c.category = 'family'
ORDER BY c.lastAccessed DESC
```

**6. Get medication confirmation logs (last 7 days):**
```sql
SELECT c.medication.name, c.confirmationLogs
FROM c 
WHERE c.userId = 'user_12345' 
  AND c.type = 'reminder'
  AND c.reminderType = 'medication'
```

---

## Change Feed Configuration

**Purpose:** Real-time family dashboard updates

**Monitored Containers:**
- Conversations (for new conversations)
- SafetyIncidents (for critical alerts)
- Reminders (for confirmation updates)

**Change Feed Processor:**
```javascript
// Pseudo-code
changeFeedProcessor.on('change', (changes) => {
  changes.forEach(doc => {
    if (doc.type === 'safety_incident' && doc.severity === 'critical') {
      // Send real-time push notification to family dashboard
      notificationService.sendPush(doc.userId, doc);
    }
    if (doc.type === 'reminder' && doc.confirmationLogs.length > 0) {
      // Update family dashboard with medication confirmation
      dashboardService.updateReminderStatus(doc.userId, doc);
    }
  });
});
```

---

## Performance Optimization

### Request Units (RU) Allocation

**Users Container:** 400 RU/s (low read/write volume)  
**Conversations Container:** 1000 RU/s (high write volume)  
**UserMemories Container:** 400 RU/s (moderate reads)  
**Reminders Container:** 400 RU/s (moderate reads/writes)  
**SafetyIncidents Container:** 400 RU/s (low write, critical reads)  
**Photos Container:** 400 RU/s (low read/write)

**Total:** ~3000 RU/s = ~$150-200/month for 100 users

### Indexing Best Practices

- **Include only queried paths** (reduce RU consumption)
- **Exclude large text fields** (audioUrl, promptUsed)
- **Use composite indexes** for multi-field queries
- **Enable vector indexes** for semantic search (future)

### TTL Strategy

- **Conversations:** 90 days (GDPR compliance)
- **Safety Incidents:** 7 years (medical compliance)
- **All others:** Permanent (until user deletion)

### Caching Strategy

**Redis Layer:**
- Cache user profiles (15-min TTL)
- Cache today's reminders (5-min TTL)
- Cache recent conversation turns (session-based)

**Result:** Reduce Cosmos DB reads by ~60%

---

## Cost Estimation

### 100 Users
- 3000 RU/s × $0.008/hour × 730 hours = ~$175/month
- Storage: 50 GB × $0.25/GB = $12.50/month
- **Total:** ~$187.50/month

### 1000 Users
- 15,000 RU/s × $0.008/hour × 730 hours = ~$875/month
- Storage: 500 GB × $0.25/GB = $125/month
- **Total:** ~$1000/month

### 10,000 Users
- 75,000 RU/s × $0.008/hour × 730 hours = ~$4380/month
- Storage: 5 TB × $0.25/GB = $1280/month
- **Total:** ~$5660/month

**Cost per user:** ~$0.50-0.60/month (decreases with scale)

---

## Migration Strategy (if coming from PostgreSQL)

1. **Export PostgreSQL data** to JSON format
2. **Transform schema** to Cosmos DB document format
3. **Bulk import** using Azure Data Factory
4. **Validate data** with test queries
5. **Switch traffic** to Cosmos DB
6. **Monitor performance** for 1 week
7. **Decommission PostgreSQL**

---

## Security

- **Encryption at rest:** Enabled by default
- **Encryption in transit:** TLS 1.2+
- **Role-Based Access Control (RBAC):** Separate read/write roles
- **Private endpoints:** No public internet access (future)
- **Audit logging:** Track all data access

---

*This Cosmos DB design provides a scalable, compliant, and performant foundation for the Never Alone application.*
