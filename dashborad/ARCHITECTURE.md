# 🎓 Course Selection Dashboard - Clean Architecture

## 📋 System Overview

Simple, clean data flow: **Google Sheets** → **Supabase** → **Dashboard**

---

## 🔄 Data Flow

```
Google Sheets (CSV)
    ↓ (Every 10 seconds - NEW entries only)
Supabase `applications` table (status: 'Pending')
    ↓
Admin Dashboard
    ├─ Approve → Move to `approved_applications` table
    ├─ Reject → Move to `rejected_applications` table
    └─ All actions logged to `admin_logs` table
```

---

## 📁 Core Files

### **1. index.html**
- Main dashboard page
- Loads all modules in correct order

### **2. data-manager.js** (Backend Logic)
**What it does:**
- Connects to Supabase
- Loads all applications
- Handles approve/reject operations
- Saves admin logs
- Tracks login sessions

**Key Functions:**
```javascript
DataManager.init()                    // Initialize connection
DataManager.getAll()                  // Get all applications
DataManager.approve(id, payment)      // Approve application
DataManager.reject(id, reason)        // Reject application
DataManager.saveLog(type, title, msg) // Save admin log
DataManager.getLogs(limit)            // Get admin logs
```

### **3. sheets-sync.js** (Google Sheets Sync)
**What it does:**
- Fetches Google Sheets CSV every 10 seconds
- Checks for NEW entries (not in Supabase)
- Adds only new applications to Supabase
- Never duplicates existing data

**Auto-start:** Called in index.html

### **4. app.js** (UI Layer)
**What it does:**
- Displays applications in dashboard
- Handles approve/reject button clicks
- Updates statistics and charts
- Calls DataManager for all data operations

### **5. admin-log-functions.js** (Logging)
**What it does:**
- Displays logs in UI
- Saves logs to Supabase via DataManager
- Persists across sessions

---

## 🗄️ Supabase Tables

### **applications** (Main table)
- All applications from Google Sheets
- Status: 'Pending', 'Approved', or 'Rejected'
- Updated when approved/rejected

### **approved_applications**
- Copy of approved applications
- Includes payment details
- Permanent record

### **rejected_applications**
- Copy of rejected applications
- Includes rejection reason
- Permanent record

### **admin_logs**
- All admin actions
- Persists across sessions
- Visible to all admins

### **payments**
- Payment transaction records
- Linked to approved applications

### **login_sessions**
- Tracks admin logins
- Device and browser info

### **pending_applications**
- Currently unused (can be used for staging)

---

## 🚀 How It Works

### **1. Admin Logs In**
```javascript
// In index.html:
await DataManager.init()              // Connect to Supabase
applications = DataManager.getAll()   // Load all applications
logs = await DataManager.getLogs(50)  // Load previous session logs
SheetsSync.start()                    // Start Google Sheets sync
```

### **2. Google Sheets Sync (Every 10 seconds)**
```javascript
// sheets-sync.js automatically:
1. Fetch CSV from Google Sheets
2. Parse entries
3. Check which IDs exist in Supabase
4. Insert ONLY new entries
5. Never duplicates
```

### **3. Admin Approves Application**
```javascript
// In app.js:
DataManager.approve(id, paymentDetails)

// data-manager.js does:
1. Update applications table (status = 'Approved')
2. Insert to approved_applications table
3. Insert to payments table
4. Save log to admin_logs table
5. Trigger UI refresh
```

### **4. Admin Rejects Application**
```javascript
// In app.js:
DataManager.reject(id, reason)

// data-manager.js does:
1. Update applications table (status = 'Rejected')
2. Insert to rejected_applications table
3. Save log to admin_logs table
4. Trigger UI refresh
```

### **5. Admin Logs Out**
```javascript
// All logs already saved to admin_logs table
// Next admin login will see all previous logs
```

---

## ✅ What Was Fixed

### **Problem:** Data reset after logout
- Old logs disappeared
- Rejected applications not saving
- Pending count resetting

### **Solution:** Pure Supabase architecture
- ❌ **Removed:** localStorage (caused conflicts)
- ✅ **Added:** data-manager.js (single source of truth)
- ✅ **Fixed:** admin-log-functions.js (saves to Supabase)
- ✅ **Fixed:** app.js (uses DataManager API)

---

## 🧪 Testing

### **Check if working:**
1. Open dashboard → Should see all applications
2. Approve 1 → Check `approved_applications` table in Supabase
3. Reject 1 → Check `rejected_applications` table in Supabase
4. Check `admin_logs` table → Should have new entries
5. Logout → Re-login → Logs should still be there

### **Check Google Sheets sync:**
1. Add new row to Google Sheets
2. Wait 10-20 seconds
3. Check `applications` table in Supabase → Should have new entry
4. Dashboard → Should show new application

---

## 📦 Deployment (Netlify)

### **Files needed:**
- index.html
- login.html
- app.js
- data-manager.js
- sheets-sync.js
- admin-log-functions.js
- styles.css

### **Auto-deploy:**
```bash
git add -A
git commit -m "Update dashboard"
git push origin main
# Netlify auto-deploys in 1-2 minutes
```

---

## 🔐 Security

- Supabase Row Level Security (RLS) enabled
- Anonymous key used (read/write access)
- No sensitive data exposed
- Session stored in sessionStorage only

---

## 📊 Data Persistence

✅ **Persistent (survives logout):**
- All applications in Supabase
- Approved applications
- Rejected applications
- Admin logs (all sessions)
- Login sessions
- Payment records

❌ **Not persistent (session only):**
- Admin username (sessionStorage)
- Current UI state

---

## 🎯 Simple Architecture

**3 Core Modules:**
1. **data-manager.js** → All Supabase operations
2. **sheets-sync.js** → Google Sheets → Supabase
3. **app.js** → UI + User actions

**1 Data Source:**
- Supabase (no localStorage, no conflicts)

**1 Direction:**
- Google Sheets → Supabase → Dashboard
- (Never writes back to Google Sheets)

---

**Last Updated:** November 8, 2025  
**Status:** ✅ Clean, working, deployed
