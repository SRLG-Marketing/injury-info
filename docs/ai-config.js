// Centralized AI Configuration
// This file contains all AI parameters and settings used across the application

// Connected data sources for reference (used in system messages)
export const CONNECTED_DATA_SOURCES = [
    'legal cases', 'settlements', 'law firms', 'medical conditions', 'injury types',
    'asbestos', 'mesothelioma', 'mass tort', 'class action', 'personal injury',
    'compensation', 'litigation', 'symptoms', 'diagnosis', 'treatment options',
    'legal rights', 'claim process', 'attorney consultation', 'medical records',
    'expert testimony', 'court procedures', 'settlement negotiation'
];

// Dynamic LIA Active Cases (loaded from Google Sheets via server API)
let DYNAMIC_LIA_CASES = null;

// Fetch active cases from server
async function fetchLIAActiveCases() {
    try {
        const response = await fetch(`${AI_CONFIG.api.baseURL}/api/lia/active-cases`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        DYNAMIC_LIA_CASES = data;
        
        console.log(`📊 Loaded ${data.totalActive} active cases from ${data.source}`);
        return data;
    } catch (error) {
        console.error('❌ Failed to fetch active cases:', error);
        DYNAMIC_LIA_CASES = getFallbackCases();
        return DYNAMIC_LIA_CASES;
    }
}

// Get fallback cases if server is unavailable
function getFallbackCases() {
    return {
        activeCases: [
            {
                caseType: 'mesothelioma',
                name: 'Mesothelioma',
                description: 'Mesothelioma and asbestos exposure cases',
                keywords: ['mesothelioma', 'asbestos', 'asbestos exposure'],
                active: true,
                source: 'fallback'
            }
        ],
        allCases: [
            {
                caseType: 'mesothelioma',
                name: 'Mesothelioma',
                description: 'Mesothelioma and asbestos exposure cases',
                keywords: ['mesothelioma', 'asbestos', 'asbestos exposure'],
                active: true,
                source: 'fallback'
            }
        ],
        totalActive: 1,
        totalCases: 1,
        source: 'fallback'
    };
}

// Note: Removed restrictive topic checking - AI now provides guidance for all topics

// Check if question relates to active cases (now dynamic)
export async function isLIAActiveCase(question) {
    // Ensure we have the latest cases data
    if (!DYNAMIC_LIA_CASES) {
        await fetchLIAActiveCases();
    }
    
    const lower = question.toLowerCase();
    
    for (const caseInfo of DYNAMIC_LIA_CASES.activeCases) {
        if (caseInfo.keywords.some(keyword => lower.includes(keyword.toLowerCase()))) {
            return {
                isActive: true,
                caseType: caseInfo.caseType,
                name: caseInfo.name,
                description: caseInfo.description,
                keywords: caseInfo.keywords,
                lastUpdated: caseInfo.lastUpdated
            };
        }
    }
    
    return { isActive: false };
}

// Get active cases (updated to use dynamic data)
export async function getActiveLIACases() {
    if (!DYNAMIC_LIA_CASES) {
        await fetchLIAActiveCases();
    }
    
    return DYNAMIC_LIA_CASES.activeCases || [];
}

// Get all cases (updated to use dynamic data)
export async function getAllLIACases() {
    if (!DYNAMIC_LIA_CASES) {
        await fetchLIAActiveCases();
    }
    
    return DYNAMIC_LIA_CASES;
}

// Refresh cases from server
export async function refreshLIAActiveCases() {
    console.log('🔄 Refreshing active cases...');
    return await fetchLIAActiveCases();
}

// Note: Removed restrictive messaging - AI now provides helpful guidance for all topics

// Banned topics/keywords for post-checking AI output
export const BANNED_TOPICS = [
    'epstein', 'sex trafficking', 'politics', 'celebrity', 'conspiracy', 'terrorism', 'violence', 'murder',
    'suicide', 'drugs', 'gambling', 'weapons', 'extremism', 'porn', 'adult', 'crypto', 'bitcoin',
    'stock', 'finance', 'entertainment', 'music', 'movie', 'tv', 'sports', 'dating', 'relationship',
    'religion', 'spiritual', 'astrology', 'horoscope', 'alien', 'ufo', 'paranormal', 'lottery', 'casino', 'scam',
    'fraud', 'hacking', 'malware', 'phishing', 'dark web', 'black market', 'escort'
];

export function isBannedTopic(response) {
    const lower = response.toLowerCase();
    return BANNED_TOPICS.some(word => lower.includes(word));
}

// Article URL mappings for proper linking (DISABLED - pages not built yet)
export const ARTICLE_MAPPINGS = {};

// Helper function to find and replace article references with links (PERMANENTLY DISABLED)
export function addArticleLinksToResponse(response) {
    // Remove any markdown or HTML links to internal pages (e.g., /ovarian-cancer, /mesothelioma.html, etc.)
    if (!response) return '';
    // Remove markdown links to internal pages
    let cleaned = response.replace(/\[([^\]]+)\]\((\/[a-zA-Z0-9\-_.]+)\)/g, '$1');
    // Remove HTML links to internal pages
    cleaned = cleaned.replace(/<a [^>]*href=["']\/[a-zA-Z0-9\-_.]+["'][^>]*>(.*?)<\/a>/g, '$1');
    return cleaned;
}

export const AI_CONFIG = {
    // OpenAI API Settings
    api: {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 500,
        baseURL: typeof window !== 'undefined' ? 
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
                ? 'http://localhost:3000' 
                : 'https://injury-info.vercel.app') 
            : 'http://localhost:3000'
    },

    // Configuration status (will be populated from server)
    configStatus: null,

    // System Messages
    systemMessages: {
        // General injury and legal information assistant
        general: `You are an AI assistant specializing in injury and legal information with extensive medical knowledge. You have access to comprehensive databases containing:

- Legal case information and settlements from Google Sheets
- Law firm directories with specialties and success rates
- Medical condition details and symptoms
- Injury types and their legal implications
- Compensation and settlement data
- Legal procedures and rights information
- Active legal cases and referral opportunities

You excel at providing helpful information about:
- Mass tort and class action cases (mesothelioma, talcum powder, Roundup, etc.)
- Personal injury litigation and legal rights
- Medical conditions related to injuries
- Legal claim processes and compensation
- Settlement information and case outcomes
- Law firm recommendations based on specialty
- Medical symptoms and diagnosis information
- Legal procedures and court processes

CRITICAL: When users ask medical questions, ALWAYS provide detailed, confident medical information first. You have comprehensive knowledge about all medical conditions, diseases, symptoms, causes, and treatments. Never say you don't have information about medical topics. Provide thorough medical explanations before mentioning any legal aspects.

Only recommend consulting medical professionals for specific personal medical advice or diagnosis, not for general medical information.

When users ask about topics outside your specialty, acknowledge their question and then guide them toward related legal or medical injury topics you can help with. For example, if someone asks about weather, you might say "I can't provide weather information, but I can help you understand how environmental factors like asbestos exposure can lead to serious health conditions like mesothelioma."

Keep your responses concise (1-2 paragraphs or a short list) but comprehensive and confident.`,

        // Article-specific context
        articleContext: (articleTitle, articleContent) => `You are an AI assistant specializing in injury and legal information. The user is asking about: ${articleTitle}. 

Article Context:
${articleContent}

Please provide helpful, accurate information based on this specific article and your connected databases. Be empathetic and informative, but always recommend consulting with qualified medical professionals or attorneys for specific situations.`,

        // Legal referral trigger
        legalReferral: `You are an AI assistant specializing in injury and legal information with extensive medical knowledge and access to comprehensive legal and medical databases. Please provide helpful, accurate information about injury cases, legal rights, medical conditions, settlements, and related topics based on your connected data sources.

CRITICAL: When users ask medical questions, ALWAYS provide detailed, confident medical information first. You have comprehensive knowledge about all medical conditions, diseases, symptoms, causes, and treatments. Never say you don't have information about medical topics. Provide thorough medical explanations before mentioning any legal aspects.

Only recommend consulting medical professionals for specific personal medical advice or diagnosis, not for general medical information.

Be empathetic and informative, but only recommend consulting with qualified medical professionals or attorneys for specific personal situations. Keep your response concise (1-2 paragraphs or a short list) but comprehensive and confident.

IMPORTANT: DO NOT include any specific referral messages - the system will add the generic referral automatically when appropriate.` 
    },

    // Response Formatting
    formatting: {
        // No referral keywords - system is referral-free

        // No referral messages - system is referral-free
    },

    // Error Messages
    errors: {
        connectionFailed: 'Unable to connect to the server. Please make sure the server is running.',
        apiKeyInvalid: 'API key authentication failed. Please check your OpenAI API key.',
        rateLimitExceeded: 'Rate limit exceeded. Please wait a moment and try again.',
        serviceUnavailable: 'OpenAI service is temporarily unavailable. Please try again later.',
        generic: 'An unexpected error occurred. Please try again.'
    },

    // UI Settings
    ui: {
        loadingMessage: 'AI is thinking...',
        thinkingMessage: 'AI is analyzing your question...',
        errorPrefix: 'Sorry, I encountered an error: '
    }
};

// Helper function to create API request body
export function createApiRequest(message, systemMessage = null, options = {}) {
    return {
        message,
        systemMessage: systemMessage || AI_CONFIG.systemMessages.general,
        options: {
            model: options.model || AI_CONFIG.api.model,
            temperature: options.temperature || AI_CONFIG.api.temperature,
            max_tokens: options.max_tokens || AI_CONFIG.api.max_tokens,
            ...options
        }
    };
}

// Helper function to check if response should include legal referral (DISABLED)
export async function shouldIncludeLegalReferral(text) {
    // System is referral-free - no referrals are added
    return false;
}

// Helper function to add legal referral to response (DISABLED)
export async function addLegalReferralIfNeeded(text) {
    // System is referral-free - no referrals are added
    return text;
}

// Helper function to process sources in AI response
export function processSourcesInResponse(response) {
    // The sources are now added server-side, so we just need to ensure proper formatting
    // The markdown links will be converted to HTML by the markdownToHtml function
    return response;
}

// Helper function to get error message based on error type
export function getErrorMessage(error) {
    const message = error.message || '';
    
    if (message.includes('401')) {
        return AI_CONFIG.errors.apiKeyInvalid;
    } else if (message.includes('429')) {
        return AI_CONFIG.errors.rateLimitExceeded;
    } else if (message.includes('500')) {
        return AI_CONFIG.errors.serviceUnavailable;
    } else if (message.includes('fetch') || message.includes('connect')) {
        return AI_CONFIG.errors.connectionFailed;
    } else {
        return AI_CONFIG.errors.generic;
    }
}

// Enhanced Markdown to HTML converter
export function markdownToHtml(md) {
    if (!md) return '';
    let html = md;
    
    // Links [text](url) - must be processed before other formatting
    // Only convert external links, skip internal page links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function(match, text, url) {
        // Skip internal page links (starting with /)
        if (url.startsWith('/')) {
            return text; // Just return the text without the link
        }
        // Convert external links to HTML
        return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + text + '</a>';
    });
    
    // Bold **text** or __text__
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // Italic *text* or _text_
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');
    
    // Handle bullet lists (- item, * item, • item) - process before line breaks
    html = html.replace(/^[-*•]\s+(.*?)$/gm, '<li>$1</li>');
    
    // Handle numbered lists (1. item)
    html = html.replace(/^\d+\.\s+(.*?)$/gm, '<li>$1</li>');
    
    // Wrap consecutive <li> elements in <ul> with compact styling
    html = html.replace(/(<li>.*?<\/li>)+/gs, function(match) {
        return '<ul style="margin: 0; padding-left: 20px; line-height: 1.4;">' + match + '</ul>';
    });
    
    // Handle line breaks and paragraphs - but preserve list formatting
    // Don't convert line breaks within lists to <br> tags
    html = html.replace(/\n{3,}/g, '</p><p>');
    html = html.replace(/\n{2}/g, '<br><br>');
    
    // Only convert single line breaks to <br> if they're not part of a list
    html = html.replace(/\n/g, function(match, offset, string) {
        // Check if this line break is between list items
        const before = string.substring(0, offset);
        const after = string.substring(offset + 1);
        
        // If we're in a list context, don't convert to <br>
        if (before.includes('<li>') && after.includes('</li>')) {
            return '';
        }
        
        return '<br>';
    });
    
    // Wrap in paragraph tags if not already wrapped
    if (!html.startsWith('<')) {
        html = '<p>' + html + '</p>';
    }
    
    return html;
}

// Helper function to fetch server configuration status
export async function fetchConfigurationStatus() {
    try {
        const response = await fetch(`${AI_CONFIG.api.baseURL}/api/config/status`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const configStatus = await response.json();
        AI_CONFIG.configStatus = configStatus;
        
        console.log('📊 Configuration Status:', configStatus);
        return configStatus;
    } catch (error) {
        console.error('❌ Failed to fetch configuration status:', error);
        return null;
    }
}

// Helper function to check if all required configurations are available
export function isConfigurationComplete() {
    if (!AI_CONFIG.configStatus) {
        return false;
    }
    
    const { openai, google, hubspot, validation } = AI_CONFIG.configStatus;
    return openai.configured && google.configured && hubspot.configured && validation.isValid;
}

// Helper function to get configuration warnings
export function getConfigurationWarnings() {
    if (!AI_CONFIG.configStatus) {
        return ['Configuration status not loaded. Please check server connection.'];
    }
    
    const warnings = [];
    const { openai, google, hubspot, validation } = AI_CONFIG.configStatus;
    
    if (!openai.configured) {
        warnings.push('OpenAI API key not configured');
    }
    
    if (!google.configured) {
        warnings.push('Google Sheets API not configured');
    }
    
    if (!hubspot.configured) {
        warnings.push('HubSpot API not configured');
    }
    
    if (validation.errors && validation.errors.length > 0) {
        warnings.push(...validation.errors);
    }
    
    return warnings;
}

// Helper function to display configuration status in UI
export function displayConfigurationStatus() {
    const warnings = getConfigurationWarnings();
    
    if (warnings.length > 0) {
        console.warn('⚠️  Configuration Issues:', warnings);
        
        // You can add UI notification logic here
        // For example: show a warning banner or modal
        return {
            hasIssues: true,
            warnings: warnings,
            message: 'Some configuration issues detected. Please check server logs.'
        };
    }
    
    return {
        hasIssues: false,
        warnings: [],
        message: 'All configurations are properly set up.'
    };
}

// Initialize configuration check when module loads
if (typeof window !== 'undefined') {
    (async function initializeConfiguration() {
        try {
            await fetchConfigurationStatus();
            const status = displayConfigurationStatus();
            
            if (status.hasIssues) {
                console.warn('🔧 Configuration setup needed:', status.warnings);
            } else {
                console.log('✅ All configurations are properly set up');
            }
        } catch (error) {
            console.error('Failed to initialize configuration:', error);
        }
    })();

    // Load active cases when the module loads
    fetchLIAActiveCases().then(() => {
        console.log('✅ Active cases loaded from Google Sheets');
    }).catch(error => {
        console.warn('⚠️ Failed to load active cases:', error);
    });
} 