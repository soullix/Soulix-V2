# 🚀 Deployment Guide - Minimal Dark Theme & Main Site

## 📁 Folder Structure

```
course selection/
├── minimal-dark/          # "Launching Soon" placeholder page (LIVE on main URL)
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── README.md
│
├── main-site/             # Main course selection website (test at /dashboard)
│   ├── index.html         # Course selection homepage
│   ├── ignitecoursedetails.html
│   ├── dashborad/         # Admin dashboard
│   └── [images]           # All image assets
│
├── netlify/               # Serverless functions (email sending)
│   └── functions/
│       └── sendDecision.js
│
└── netlify.toml           # Deployment configuration
```

---

## 🌐 Live URLs

### **Current Setup (Before Launch):**
- **Main URL (`/`)**: Shows minimal dark "Launching Soon" page
- **Test URL (`/dashboard`)**: Access full course selection website for testing
- **Dashboard**: `/dashboard/dashborad/` (admin panel)

### **After Launch:**
Simply update `netlify.toml` to show main-site on root URL.

---

## 🧪 Testing Your Website

### Access Test URLs:
```
Production Site: https://your-site.netlify.app/
Test Course Selection: https://your-site.netlify.app/dashboard
Test Admin Dashboard: https://your-site.netlify.app/dashboard/dashborad/
```

### Local Testing:
```bash
# Install Netlify CLI if not installed
npm install -g netlify-cli

# Start local dev server
netlify dev

# Access at:
# - http://localhost:8888/ (minimal dark page)
# - http://localhost:8888/dashboard (main site)
```

---

## ⏰ Setting Launch Date

Edit `minimal-dark/script.js` to set your launch date:

```javascript
// Option 1: Set specific date and time
const launchDate = new Date('2025-12-01T00:00:00');

// Option 2: Set hours from now (current: 36 hours)
const launchDate = new Date();
launchDate.setHours(launchDate.getHours() + 36);
```

---

## 🎬 Launch Day Instructions

When ready to make the main site live:

### **Option A: Simple Redirect Update**
1. Open `netlify.toml`
2. Change this section:
   ```toml
   # Show minimal dark theme as default homepage
   [[redirects]]
     from = "/"
     to = "/minimal-dark/index.html"
     status = 200
     force = false
   ```
   To:
   ```toml
   # Show main site as default homepage
   [[redirects]]
     from = "/"
     to = "/main-site/index.html"
     status = 200
     force = false
   ```

3. Commit and push:
   ```bash
   git add netlify.toml
   git commit -m "Launch: Switch to main site"
   git push origin main
   ```

### **Option B: Move Files (Clean URLs)**
1. Move files from `main-site/` back to root
2. Delete or archive `minimal-dark/` folder
3. Update `netlify.toml` redirects
4. Commit and push

---

## 📧 Email Setup Checklist

Before launch, ensure:
- ✅ `RESEND_API_KEY` added to Netlify environment variables
- ✅ Domain `support@soulix.tech` verified in Resend dashboard
- ✅ Test approval/rejection emails sent successfully
- ✅ Check spam folder for test emails

---

## 🔧 Netlify Environment Variables

Navigate to: **Netlify Dashboard → Site Settings → Environment Variables**

Required variables:
```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🗂️ What Gets Deleted on Launch

The `minimal-dark/` folder can be:
- **Deleted** completely (if never needed again)
- **Archived** (rename to `_archive-minimal-dark/`)
- **Kept** (for future use or reference)

No need to delete anything immediately - just update redirects.

---

## 📝 Quick Commands

```bash
# Check current status
git status

# Add all changes
git add -A

# Commit with message
git commit -m "Update: [your message]"

# Push to deploy
git push origin main

# View Netlify logs
netlify logs

# Build locally
netlify build

# Test serverless functions locally
netlify functions:serve
```

---

## 🆘 Troubleshooting

### Minimal Dark Page Not Showing
- Check `netlify.toml` redirects
- Hard refresh: `Ctrl + Shift + R`
- Clear Netlify cache: Netlify Dashboard → Deploys → Clear cache and retry deploy

### Test URL Not Working
- Verify `/main-site/` folder exists
- Check redirect paths in `netlify.toml`
- Ensure files moved correctly

### Email Not Sending
- Verify `RESEND_API_KEY` in Netlify env vars
- Check Resend dashboard for API errors
- Test function: `netlify functions:invoke sendDecision`

---

## 🎨 Customizing Minimal Dark Page

Edit these files in `minimal-dark/`:
- **index.html**: Change text, title, structure
- **style.css**: Modify colors, animations, styling
- **script.js**: Update countdown logic, form handling

Current countdown: **36 hours from page load**

---

## 📞 Support

For issues with:
- **Deployment**: Check Netlify deploy logs
- **Emails**: Check Resend dashboard
- **Database**: Check Supabase dashboard → Admin Logs

---

**Last Updated**: November 10, 2025
**Current Status**: Placeholder page live, main site available at `/dashboard`
