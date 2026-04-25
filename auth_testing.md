# Auth-Gated App Testing Playbook (Nexus 001)

## Step 1: Create Test User & Session
```
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  college: 'IIT Bombay',
  branch: 'CSE',
  upi_id: 'test@okaxis',
  whatsapp_session_active: false,
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Test Backend API
```
curl -X GET "$BACKEND_URL/api/auth/me" -H "Authorization: Bearer $TOKEN"
curl -X GET "$BACKEND_URL/api/transactions" -H "Authorization: Bearer $TOKEN"
curl -X POST "$BACKEND_URL/api/transactions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"borrower_name":"Rahul","borrower_phone":"9876543210","amount":500,"due_date":"2025-12-30","category":"FOOD"}'
```

## Step 3: Browser Testing
```python
await page.context.add_cookies([{
    "name": "session_token",
    "value": "YOUR_SESSION_TOKEN",
    "domain": "your-app.com",
    "path": "/",
    "httpOnly": True,
    "secure": True,
    "sameSite": "None"
}])
```

## Checklist
- [ ] /api/auth/me returns user
- [ ] Dashboard loads
- [ ] Transactions CRUD works
- [ ] QR code endpoints return base64 PNG
- [ ] Nudge endpoints log entries and increment nudge_count
