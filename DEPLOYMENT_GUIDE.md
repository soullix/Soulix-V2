# 🚀 Deployment Guide - SOULIX Course Selection Platform

## 📁 Folder Structure

```
course selection/
├── main-site/             # Main course selection website (LIVE on main URL)
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

### **Current Setup:**
- **Main URL (`/`)**: Course selection website
- **Admin Dashboard**: `/dashboard` (admin panel)

---

## 🧪 Testing Your Website

### Access URLs:
```
Production Site: https://your-site.netlify.app/
Admin Dashboard: https://your-site.netlify.app/dashboard
```

### Local Testing:
```bash
# Install Netlify CLI if not installed
npm install -g netlify-cli

# Start local dev server
netlify dev

# Access at:
# - http://localhost:8888/ (main site)
# - http://localhost:8888/dashboard (admin panel)
```

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

## 🆘 Troubleshooting

### Site Not Loading
- Check `netlify.toml` redirects
- Hard refresh: `Ctrl + Shift + R`
- Clear Netlify cache: Netlify Dashboard → Deploys → Clear cache and retry deploy

### Dashboard Not Working
- Verify `/main-site/dashborad/` folder exists
- Check redirect paths in `netlify.toml`
- Ensure all dashboard files are uploaded

### Email Not Sending
- Verify `RESEND_API_KEY` in Netlify env vars
- Check Resend dashboard for API errors
- Test function: `netlify functions:invoke sendDecision`

---

## 📞 Support

For issues with:
- **Deployment**: Check Netlify deploy logs
- **Emails**: Check Resend dashboard
- **Database**: Check Supabase dashboard → Admin Logs

---

**Last Updated**: November 12, 2025
**Current Status**: Main site live and operational
