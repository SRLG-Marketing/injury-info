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
  
  if (isDevelopment) {
    return [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:8080',
      'http://127.0.0.1:8080'
    ];
  }
  
  return [
    'https://injury-info.vercel.app',
    'https://your-app.vercel.app',
    'https://*.vercel.app',
    'https://srlg-marketing.github.io',
    'https://*.github.io'
  ];
} 