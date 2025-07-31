// Server URL configuration for different environments
export const SERVER_URLS = {
  development: {
    local: 'http://localhost:3000',
    localhost: 'http://127.0.0.1:3000'
  },
  production: {
    vercel: 'https://injury-info.vercel.app',
    placeholder: 'https://your-app.vercel.app'
  }
};

// Get the appropriate server URL based on environment
export function getServerUrl() {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  if (isDevelopment) {
    return SERVER_URLS.development.local;
  }
  
  // In production, you can set a specific URL via environment variable
  return process.env.PRODUCTION_URL || SERVER_URLS.production.vercel;
}

// Get server URL for client-side use
export function getClientServerUrl() {
  if (typeof window !== 'undefined') {
    // Check if we're in development mode
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
    
    if (isLocalhost) {
      return SERVER_URLS.development.local;
    }
  }
  
  // Default to production URL
  return SERVER_URLS.production.vercel;
}

// Get CORS origins for server configuration
export function getCorsOrigins() {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // Base origins - include both with and without protocol
  const baseOrigins = [
    'https://injury-info.vercel.app',
    'http://injury-info.vercel.app',
    'injury-info.vercel.app',
    'https://your-app.vercel.app',
    'https://*.vercel.app',
    'https://srlg-marketing.github.io',
    'https://*.github.io'
  ];
  
  // HubSpot domains - be more specific to avoid wildcard issues
  const hubspotOrigins = [
    'https://injuryinfo-com.sandbox.hs-sites.com',
    'https://injuryinfo-com.hs-sites.com',
    'https://*.hubspot.com',
    'https://*.hubapi.com',
    'https://*.hs-sites.com',
    'https://*.hs-sitescontent.com',
    'https://*.hsforms.com',
    'https://*.hsforms.net',
    'https://*.hubspotusercontent-na1.net',
    'https://*.hubspotusercontent-eu1.net',
    'https://*.hubspotusercontent.com'
  ];
  
  if (isDevelopment) {
    return [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:8080',
      'http://127.0.0.1:8080',
      ...baseOrigins,
      ...hubspotOrigins
    ];
  }
  
  return [...baseOrigins, ...hubspotOrigins];
}

// Function to add custom HubSpot domain
export function addHubSpotDomain(domain) {
  // This function can be used to dynamically add specific HubSpot domains
  // For now, we'll log it for debugging
  console.log(`🔧 Adding HubSpot domain to CORS: ${domain}`);
  return domain;
} 