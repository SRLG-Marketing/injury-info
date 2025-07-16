/**
 * API Client Utility
 * Automatically detects and uses the correct API base URL
 */

class ApiClient {
    constructor() {
        this.baseUrl = this.detectBaseUrl();
        this.apiBaseUrl = `${this.baseUrl}/api`;
    }

    /**
     * Detect the base URL from the current page
     */
    detectBaseUrl() {
        // Get the current page URL
        const currentUrl = window.location.href;
        const url = new URL(currentUrl);
        
        // Return the origin (protocol + hostname + port)
        return url.origin;
    }

    /**
     * Make an API request
     */
    async request(endpoint, options = {}) {
        const url = `${this.apiBaseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers,
            },
        };

        try {
            const response = await fetch(url, finalOptions);
            
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    /**
     * Chat with the AI
     */
    async chat(message, systemMessage = null, options = {}) {
        return this.request('/chat', {
            method: 'POST',
            body: JSON.stringify({
                message,
                systemMessage,
                options
            })
        });
    }

    /**
     * Get articles
     */
    async getArticles() {
        return this.request('/articles');
    }

    /**
     * Get a specific article
     */
    async getArticle(slug) {
        return this.request(`/articles/${slug}`);
    }

    /**
     * Search law firms
     */
    async getLawFirms(specialty = null, location = null) {
        const params = new URLSearchParams();
        if (specialty) params.append('specialty', specialty);
        if (location) params.append('location', location);
        
        return this.request(`/law-firms?${params.toString()}`);
    }

    /**
     * Get settlement data
     */
    async getSettlements(condition, state = null) {
        const params = new URLSearchParams();
        if (condition) params.append('condition', condition);
        if (state) params.append('state', state);
        
        return this.request(`/settlements?${params.toString()}`);
    }

    /**
     * Search for condition information
     */
    async searchCondition(condition) {
        return this.request(`/search/${encodeURIComponent(condition)}`);
    }

    /**
     * Get configuration status
     */
    async getConfigStatus() {
        return this.request('/config/status');
    }

    /**
     * Test API connection
     */
    async testConnection() {
        return this.request('/test');
    }

    /**
     * Get LIA active cases
     */
    async getLIAActiveCases() {
        return this.request('/lia/active-cases');
    }

    /**
     * Check if query relates to LIA case
     */
    async checkLIACase(query) {
        return this.request('/lia/check-case', {
            method: 'POST',
            body: JSON.stringify({ query })
        });
    }

    /**
     * Verify if an article exists
     */
    async verifyArticle(articleTitle) {
        return this.request('/verify-article', {
            method: 'POST',
            body: JSON.stringify({ articleTitle })
        });
    }

    /**
     * Clear cache
     */
    async clearCache() {
        return this.request('/cache/clear', {
            method: 'POST'
        });
    }

    /**
     * Get the current API base URL
     */
    getApiBaseUrl() {
        return this.apiBaseUrl;
    }

    /**
     * Get the current base URL
     */
    getBaseUrl() {
        return this.baseUrl;
    }
}

// Create a global instance
window.apiClient = new ApiClient();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiClient;
} 