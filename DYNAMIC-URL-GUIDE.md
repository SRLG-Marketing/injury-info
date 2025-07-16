# Dynamic URL Detection Guide

## Overview

The system automatically detects and uses the correct API base URL based on the environment where it's running, eliminating the need for hardcoded URLs.

## How It Works

### 1. **Server-Side Detection**
- Automatically detects the request URL from headers
- Handles proxies, load balancers, and CDNs
- Supports both HTTP and HTTPS
- Works across all deployment environments

### 2. **Client-Side Detection**
- JavaScript automatically detects the current page URL
- Creates API client with correct base URL
- No configuration needed for different environments

### 3. **Environment Support**
- **Development:** `http://localhost:3000`
- **Staging:** `https://staging.injury-info.vercel.app`
- **Production:** `https://injury-info.vercel.app`
- **Custom Domains:** `https://injuryinfo.com`

## Server-Side Implementation

### URL Helper Functions

```javascript
import { getBaseUrl, getApiBaseUrl } from './utils/url-helper.js';

// In any endpoint
app.get('/api/example', (req, res) => {
    const baseUrl = getBaseUrl(req);        // https://injuryinfo.com
    const apiBaseUrl = getApiBaseUrl(req);  // https://injuryinfo.com/api
    
    res.json({
        baseUrl,
        apiBaseUrl,
        // ... other data
    });
});
```

### Request Headers Handled

The system checks these headers in order:
1. `x-forwarded-proto` - Protocol (http/https)
2. `x-forwarded-host` - Hostname
3. `x-forwarded-server` - Alternative hostname
4. Standard `host` header

### Environment Variables

```bash
# Optional: Override default URLs
PRODUCTION_URL=https://injuryinfo.com
STAGING_URL=https://staging.injuryinfo.com
DEVELOPMENT_URL=http://localhost:3000
```

## Client-Side Implementation

### Automatic Detection

```javascript
// Include the API client
<script src="/api-client.js"></script>

// Use the global client
const response = await window.apiClient.chat('Hello');
console.log('API Base URL:', window.apiClient.getApiBaseUrl());
```

### Manual Usage

```javascript
import { ApiClient } from './api-client.js';

const client = new ApiClient();
const response = await client.chat('Hello');
```

### Available Methods

```javascript
// Chat with AI
await apiClient.chat(message, systemMessage, options);

// Get articles
await apiClient.getArticles();

// Search law firms
await apiClient.getLawFirms('mesothelioma', 'California');

// Get settlement data
await apiClient.getSettlements('mesothelioma', 'CA');

// Check LIA cases
await apiClient.checkLIACase('asbestos exposure');

// Get configuration
await apiClient.getConfigStatus();
```

## API Response Format

All API responses now include the detected URLs:

```json
{
  "response": "AI response...",
  "verified": true,
  "warnings": [],
  "apiBaseUrl": "https://injuryinfo.com/api",
  "usage": { ... }
}
```

## Configuration Endpoint

The `/api/config/status` endpoint returns current URLs:

```json
{
  "openai": { ... },
  "google": { ... },
  "hubspot": { ... },
  "urls": {
    "baseUrl": "https://injuryinfo.com",
    "apiBaseUrl": "https://injuryinfo.com/api",
    "environment": "production"
  }
}
```

## Testing

### Test Dynamic URLs:
```bash
node test-dynamic-urls.js
```

### Test with Different Environments:
```bash
# Development
NODE_ENV=development node server.js

# Production
NODE_ENV=production node server.js
```

### Manual API Test:
```bash
# Test from any domain
curl https://injuryinfo.com/api/config/status
curl https://staging.injuryinfo.com/api/config/status
curl http://localhost:3000/api/config/status
```

## Deployment Scenarios

### 1. **Vercel Deployment**
- Automatically detects Vercel's forwarded headers
- Works with custom domains
- Supports preview deployments

### 2. **Custom Domain**
- Detects custom domain automatically
- No configuration needed
- Works with SSL certificates

### 3. **Load Balancer/Proxy**
- Handles forwarded headers correctly
- Supports multiple proxy layers
- Maintains correct protocol detection

### 4. **Local Development**
- Falls back to localhost:3000
- Supports different ports
- Works with ngrok tunnels

## Benefits

✅ **No Hardcoded URLs** - Automatically adapts to environment  
✅ **Zero Configuration** - Works out of the box  
✅ **Proxy Support** - Handles complex deployment setups  
✅ **SSL Detection** - Automatically uses HTTPS in production  
✅ **Environment Aware** - Different behavior per environment  
✅ **Future Proof** - Easy to add new domains  

## Troubleshooting

### Wrong Protocol (HTTP vs HTTPS)
- Check `x-forwarded-proto` header
- Verify SSL termination configuration
- Review proxy/load balancer settings

### Wrong Hostname
- Check `x-forwarded-host` header
- Verify domain configuration
- Review DNS settings

### Local Development Issues
- Ensure port 3000 is available
- Check firewall settings
- Verify localhost resolution

### Production Issues
- Check Vercel deployment settings
- Verify custom domain configuration
- Review environment variables 