# GitHub Pages Setup Guide

This guide explains how to deploy the chatbot demo page on GitHub Pages while keeping your server running on Vercel.

## Overview

Your setup will have:
- **Frontend**: GitHub Pages (static HTML/CSS/JS)
- **Backend**: Vercel (Node.js server with API endpoints)
- **Communication**: Frontend makes API calls to Vercel server

## Step 1: Prepare Your Repository

1. **Create a new branch for GitHub Pages** (optional but recommended):
   ```bash
   git checkout -b gh-pages
   ```

2. **Use your existing index page**:
   - Your `public/index.html` has been updated to work with GitHub Pages
   - It now includes server configuration functionality
   - No need for separate files - everything is integrated!

## Step 2: Configure GitHub Pages

### Option A: Deploy from /public folder (Recommended)
1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under **Source**, select **Deploy from a branch**
4. Choose **main** branch and **/public** folder
5. Click **Save**

### Option B: Deploy from Root
1. Copy `public/index.html` to the root of your repository as `index.html`
2. In GitHub Settings → Pages, select **Deploy from a branch**
3. Choose **main** branch and **/(root)** folder

## Step 3: Update Server URL

1. **Deploy your server to Vercel** (if not already done):
   ```bash
   vercel --prod
   ```

2. **Update the server URL** in the demo page:
   - Open the deployed GitHub Pages site
   - **Double-click the AI chat button** (💬) to open server configuration
   - Enter your Vercel URL: `https://injury-info.vercel.app/`
   - Click "Save" - the URL will be saved in localStorage for future visits

## Step 4: Test the Setup

1. **Visit your GitHub Pages URL**: `https://yourusername.github.io/your-repo-name/`
2. **Test the connection** using the "Test Connection" button
3. **Try sending a message** to verify everything works

## CORS Configuration

Your Vercel server already has CORS enabled, but if you encounter issues, ensure your `server.js` has:

```javascript
app.use(cors({
  origin: ['https://yourusername.github.io', 'http://localhost:3000'],
  credentials: true
}));
```

## File Structure

```
your-repo/
├── public/
│   └── index.html (GitHub Pages demo - updated with server config)
├── server.js (Vercel server)
├── vercel.json (Vercel config)
└── ... (other files)
```

## Key Features

### Updated `public/index.html`
- **Integrated AI functionality** with your existing medical/legal website
- **Configurable server URL** - double-click the AI chat button to configure
- **Works with GitHub Pages** - makes API calls to your Vercel server
- **Full website experience** - not just a chatbot, but a complete information site
- **Mobile responsive** - works great on all devices

## Troubleshooting

### Common Issues:

1. **CORS Errors**:
   - Ensure your Vercel server allows requests from your GitHub Pages domain
   - Check that CORS is properly configured in `server.js`

2. **Server URL Issues**:
   - Verify your Vercel deployment URL is correct: `https://injury-info.vercel.app/`
   - Test the API endpoint directly: `https://injury-info.vercel.app/api/chat`

3. **Module Import Errors**:
   - GitHub Pages doesn't support ES6 modules in the same way
   - Use the GitHub Pages compatible version instead

4. **Environment Variables**:
   - All environment variables are handled on the Vercel server
   - No need to expose them in the frontend

## Benefits of This Setup

✅ **Separation of Concerns**: Frontend and backend are independent
✅ **Cost Effective**: GitHub Pages is free for static hosting
✅ **Scalable**: Vercel handles server scaling automatically
✅ **Flexible**: Easy to update either frontend or backend independently
✅ **Secure**: API keys and environment variables stay on the server

## Next Steps

1. Deploy your server to Vercel
2. Set up GitHub Pages with the provided HTML file
3. Test the connection between the two
4. Share your GitHub Pages URL for demos!

Your demo will be available at: `https://yourusername.github.io/your-repo-name/`

**Your Vercel Server URL**: `https://injury-info.vercel.app/` 