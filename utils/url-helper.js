/**
 * URL Helper Utilities
 * Provides functions to get the correct base URL from requests
 */

/**
 * Get the base URL from an Express request
 * Handles various deployment scenarios (localhost, production, proxies)
 */
export function getBaseUrl(req) {
    // Check for forwarded headers (common in production with proxies)
    const protocol = req.headers['x-forwarded-proto'] || 
                    req.headers['x-forwarded-protocol'] || 
                    req.protocol;
    
    const host = req.headers['x-forwarded-host'] || 
                 req.headers['x-forwarded-server'] || 
                 req.headers.host;
    
    // Ensure protocol is correct
    const secureProtocol = protocol === 'https' || 
                          req.headers['x-forwarded-proto'] === 'https' || 
                          req.secure;
    
    const finalProtocol = secureProtocol ? 'https' : 'http';
    
    return `${finalProtocol}://${host}`;
}

/**
 * Get the API base URL (base URL + /api)
 */
export function getApiBaseUrl(req) {
    const baseUrl = getBaseUrl(req);
    return `${baseUrl}/api`;
}

/**
 * Get the full URL for a specific endpoint
 */
export function getEndpointUrl(req, endpoint) {
    const apiBase = getApiBaseUrl(req);
    return `${apiBase}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
}

/**
 * Get environment-specific base URL
 * Useful for generating URLs outside of request context
 */
export function getEnvironmentBaseUrl() {
    const env = process.env.NODE_ENV || 'development';
    
    if (env === 'production') {
        // Production URLs - update these as needed
        return process.env.PRODUCTION_URL || 'https://injury-info.vercel.app';
    } else if (env === 'staging') {
        return process.env.STAGING_URL || 'https://staging.injury-info.vercel.app';
    } else {
        // Development
        return process.env.DEVELOPMENT_URL || 'http://localhost:3000';
    }
}

/**
 * Get environment-specific API base URL
 */
export function getEnvironmentApiBaseUrl() {
    const baseUrl = getEnvironmentBaseUrl();
    return `${baseUrl}/api`;
}

/**
 * Validate if a URL is a valid API endpoint
 */
export function isValidApiEndpoint(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.pathname.startsWith('/api/');
    } catch (error) {
        return false;
    }
}

/**
 * Extract API endpoint path from full URL
 */
export function extractApiEndpoint(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.pathname.replace(/^\/api/, '');
    } catch (error) {
        return null;
    }
} 