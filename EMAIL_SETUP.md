# 📧 Email Setup Instructions

## 🚀 Netlify Serverless Function + Resend API

This project uses **Netlify Functions** to send approval/rejection emails via **Resend API**.

---

## ✅ Step 1: Install Dependencies

Run this command in your project root:

```bash
npm install
```

This installs:
- `resend` - Email API client
- `netlify-cli` - For local development

---

## ✅ Step 2: Get Resend API Key

1. Go to [Resend.com](https://resend.com) and sign up
2. Navigate to **API Keys** section
3. Create a new API key
4. Copy the key (starts with `re_...`)

---

## ✅ Step 3: Configure Netlify Environment Variables

### Option A: Netlify Dashboard (Production)

1. Go to your Netlify dashboard
2. Navigate to: **Site Settings** → **Environment Variables**
3. Add new variable:
   - **Key**: `RESEND_API_KEY`
   - **Value**: `re_xxxxxxxxxxxxxxxxx` (your Resend API key)
4. Save and **redeploy your site**

### Option B: Local Development

Create a `.env` file in your project root:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
```

⚠️ **Never commit `.env` to git!** (already in `.gitignore`)

---

## ✅ Step 4: Test Locally (Optional)

Run local Netlify dev server:

```bash
netlify dev
```

Your site will run at `http://localhost:8888`
Netlify functions will be at `http://localhost:8888/.netlify/functions/sendDecision`

---

## 🎯 How It Works

```
User clicks Approve/Reject button
        ↓
Dashboard JS calls /.netlify/functions/sendDecision
        ↓
Netlify Function (backend) → Resend API
        ↓
Beautiful HTML email sent to student
```

### Approval Email:
- ✅ Green gradient design
- Payment details (amount, reference, UPI ID)
- Course information
- Professional SOULIX branding

### Rejection Email:
- ⚠️ Red gradient warning design
- Optional rejection reason/notes
- Support contact information
- Professional SOULIX branding

---

## 📁 File Structure

```
/netlify/functions/
  └── sendDecision.js       ← Serverless function (sends emails)

/dashborad/
  └── app.js               ← Calls the function when approve/reject

package.json               ← Dependencies (resend)
.gitignore                 ← Excludes node_modules, .env
```

---

## 🔒 Security Benefits

✅ **API key never exposed** in frontend JavaScript
✅ **Serverless function** runs on Netlify backend
✅ **Free tier** of Netlify Functions (125k requests/month)
✅ **No Make.com / Zapier** needed (saves money)

---

## 🎨 Email Templates

Both emails use:
- Responsive HTML design
- SOULIX logo (from `https://soulix.tech/logo.png`)
- Professional gradients and styling
- Mobile-friendly layout

---

## 🐛 Troubleshooting

**Email not sending?**
1. Check Netlify logs: Site → Functions → sendDecision
2. Verify `RESEND_API_KEY` is set in environment variables
3. Check Resend dashboard for delivery status
4. Verify sender domain (`support@soulix.tech`) is verified in Resend

**Function not found?**
1. Ensure `netlify/functions/` folder exists
2. Run `npm install` to install dependencies
3. Redeploy to Netlify

**API key error?**
1. Make sure key starts with `re_`
2. Check for extra spaces in environment variable
3. Redeploy after adding the key

---

## 📞 Support

Questions? Contact: **support@soulix.tech**

---

## 🚀 Deployment Checklist

- [x] Create `/netlify/functions/sendDecision.js`
- [x] Update `app.js` email functions
- [x] Add `package.json` with resend dependency
- [ ] Run `npm install` locally
- [ ] Add `RESEND_API_KEY` to Netlify environment variables
- [ ] Verify sender email in Resend dashboard
- [ ] Push to GitHub
- [ ] Wait for Netlify auto-deploy
- [ ] Test approval/rejection emails

---

**Made with ❤️ by SOULIX**
