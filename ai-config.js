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

// Fetch LIA active cases from server
async function fetchLIAActiveCases() {
    try {
        const response = await fetch(`${AI_CONFIG.api.baseURL}/api/lia/active-cases`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        DYNAMIC_LIA_CASES = data;
        
        console.log(`📊 Loaded ${data.totalActive} active LIA cases from ${data.source}`);
        return data;
    } catch (error) {
        console.error('❌ Failed to fetch LIA active cases:', error);
        DYNAMIC_LIA_CASES = getFallbackLIACases();
        return DYNAMIC_LIA_CASES;
    }
}

// Get fallback LIA cases if server is unavailable
function getFallbackLIACases() {
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

// Check if question relates to LIA active cases (now dynamic)
export async function isLIAActiveCase(question) {
    // Ensure we have the latest LIA cases data
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

// Get active LIA cases (updated to use dynamic data)
export async function getActiveLIACases() {
    if (!DYNAMIC_LIA_CASES) {
        await fetchLIAActiveCases();
    }
    
    return DYNAMIC_LIA_CASES.activeCases || [];
}

// Get all LIA cases (updated to use dynamic data)
export async function getAllLIACases() {
    if (!DYNAMIC_LIA_CASES) {
        await fetchLIAActiveCases();
    }
    
    return DYNAMIC_LIA_CASES;
}

// Refresh LIA cases from server
export async function refreshLIAActiveCases() {
    console.log('🔄 Refreshing LIA active cases...');
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

// Article URL mappings for proper linking
export const ARTICLE_MAPPINGS = {
    'mesothelioma symptoms': '/mesothelioma.html',
    'mesothelioma diagnosis': '/mesothelioma.html',
    'mesothelioma signs': '/mesothelioma.html',
    'mesothelioma warning signs': '/mesothelioma.html',
    'mesothelioma early signs': '/mesothelioma.html',
    'mesothelioma': '/mesothelioma.html',
    'asbestos exposure': '/mesothelioma.html',
    'asbestos exposure risks': '/mesothelioma.html',
    'asbestos related diseases': '/mesothelioma.html',
    'asbestos': '/mesothelioma.html',
    'legal options': '/legal-options.html',
    'legal advice': '/legal-options.html',
    'injury diagnosis': '/legal-options.html',
    'compensation options': '/compensation.html',
    'settlement options': '/compensation.html',
    'compensation': '/compensation.html',
    'settlement': '/compensation.html',
    'caregiver support': '/caregivers.html',
    'caring for someone': '/caregivers.html',
    'medical costs': '/cost-of-care.html',
    'cost of treatment': '/cost-of-care.html',
    'treatment costs': '/cost-of-care.html',
    'financial support': '/cost-of-care.html',
    'ovarian cancer': '/ovarian-cancer.html',
    'lymphoma': '/lymphoma.html',
    'mass tort': '/mass-tort.html',
    'class action': '/class-action.html'
};

// Helper function to find and replace article references with links
export function addArticleLinksToResponse(response) {
    let processedResponse = response;
    
    // Handle various article reference patterns with flexible matching
    const patterns = [
        /For more (?:detailed )?information (?:about|on) ([^,.\n]+)/gi,
        /You can (?:also )?(?:read|learn) (?:more )?about ([^,.\n]+)/gi,
        /(?:Learn|Read) more about ([^,.\n]+)/gi,
        /More information (?:about|on) ([^,.\n]+)/gi
    ];
    
    patterns.forEach(pattern => {
        processedResponse = processedResponse.replace(pattern, (match, articleTopic) => {
            const topic = articleTopic.toLowerCase().trim();
            
            // Find the best matching article URL
            for (const [key, url] of Object.entries(ARTICLE_MAPPINGS)) {
                if (topic.includes(key.toLowerCase()) || key.toLowerCase().includes(topic)) {
                    const properLink = `<a href="${url}" target="_blank">${articleTopic.trim()}</a>`;
                    return match.replace(articleTopic, properLink);
                }
            }
            return match; // Return original if no match found
        });
    });
    
    // Clean up any malformed HTML that might have been created
    processedResponse = processedResponse.replace(/([^"]\w+\.html)"?\s*target="?blank"?>/gi, '');
    
    // Handle standalone topic mentions (but be more careful to avoid over-matching)
    const topicPatterns = [
        'mesothelioma symptoms and diagnosis',
        'mesothelioma symptoms',
        'mesothelioma diagnosis',
        'asbestos exposure risks',
        'asbestos exposure',
        'legal options',
        'compensation options',
        'medical costs',
        'ovarian cancer',
        'lymphoma',
        'mass tort',
        'class action'
    ];
    
    topicPatterns.forEach(topic => {
        // Only replace if it's not already part of a link
        const regex = new RegExp(`(?<!<a[^>]*>)\\b${topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b(?![^<]*</a>)`, 'gi');
        const url = ARTICLE_MAPPINGS[topic.toLowerCase()];
        if (url) {
            processedResponse = processedResponse.replace(regex, `<a href="${url}" target="_blank">${topic}</a>`);
        }
    });
    
    return processedResponse;
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
        general: `You are an AI assistant specializing in injury and legal information. You have access to comprehensive databases containing:

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

When users ask about topics outside your specialty, acknowledge their question and then guide them toward related legal or medical injury topics you can help with. For example, if someone asks about weather, you might say "I can't provide weather information, but I can help you understand how environmental factors like asbestos exposure can lead to serious health conditions like mesothelioma."

Always be empathetic and informative, but recommend consulting with qualified medical professionals or attorneys for specific situations. Keep your responses concise (1-2 paragraphs or a short list).

IMPORTANT: When relevant to the user's query, reference helpful articles from our site by mentioning specific topics naturally in your response.`,

        // Article-specific context
        articleContext: (articleTitle, articleContent) => `You are an AI assistant specializing in injury and legal information. The user is asking about: ${articleTitle}. 

Article Context:
${articleContent}

Please provide helpful, accurate information based on this specific article and your connected databases. Be empathetic and informative, but always recommend consulting with qualified medical professionals or attorneys for specific situations.`,

        // Legal referral trigger
        legalReferral: `You are an AI assistant specializing in injury and legal information with access to comprehensive legal and medical databases. Please provide helpful, accurate information about injury cases, legal rights, medical conditions, settlements, and related topics based on your connected data sources.

Be empathetic and informative, but always recommend consulting with qualified medical professionals or attorneys for specific situations. Keep your response concise (1-2 paragraphs or a short list).

IMPORTANT: If the user asks about legal options, filing claims, consulting attorneys, or seeking legal advice, mention that they can start their claim at legalinjuryadvocates.com.

When relevant to the user's query, reference helpful articles from our site by mentioning specific topics naturally in your response.` 
    },

    // Response Formatting
    formatting: {
        // Keywords that trigger legal referral
        legalReferralKeywords: [
            'consult', 'speak to', 'talk to', 'meet with', 'attorney', 'lawyer', 
            'file a claim', 'legal advice', 'legal options', 'seek legal', 
            'recommend', 'contact a lawyer', 'contact an attorney', 'how to file',
            'where to file', 'get compensation', 'payout', 'settlement'
        ],

        // Legal referral message
        legalReferralMessage: `<br><br><strong>➡️ You can start your claim at <a href="https://legalinjuryadvocates.com" target="_blank">legalinjuryadvocates.com</a>.</strong>`
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

// Helper function to check if response should include legal referral
export async function shouldIncludeLegalReferral(text) {
    // Check if the text relates to LIA active cases
    const liaCheck = await isLIAActiveCase(text);
    if (!liaCheck.isActive) {
        return false;
    }
    
    // Check if text contains legal-related keywords
    const lowerText = text.toLowerCase();
    return AI_CONFIG.formatting.legalReferralKeywords.some(keyword => 
        lowerText.includes(keyword.toLowerCase())
    );
}

// Helper function to add legal referral to response
export async function addLegalReferralIfNeeded(text) {
    const liaCheck = await isLIAActiveCase(text);
    
    if (liaCheck.isActive && await shouldIncludeLegalReferral(text)) {
        return text + `<br><br><strong>➡️ Legal Injury Advocates is currently handling ${liaCheck.description.toLowerCase()}. You can start your claim at <a href="https://legalinjuryadvocates.com" target="_blank">legalinjuryadvocates.com</a>.</strong>`;
    }
    
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
    
    // Bold **text** or __text__
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // Italic *text* or _text_
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');
    
    // Handle numbered lists (1. item)
    html = html.replace(/^\d+\.\s+(.*?)$/gm, '<li>$1</li>');
    
    // Handle bullet lists (- item, * item, • item)
    html = html.replace(/^[-*•]\s+(.*?)$/gm, '<li>$1</li>');
    
    // Wrap consecutive <li> elements in <ul>
    html = html.replace(/(<li>.*?<\/li>)+/gs, function(match) {
        return '<ul>' + match + '</ul>';
    });
    
    // Handle line breaks and paragraphs
    html = html.replace(/\n{3,}/g, '</p><p>');
    html = html.replace(/\n{2}/g, '<br><br>');
    html = html.replace(/\n/g, '<br>');
    
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

    // Load LIA cases when the module loads
    fetchLIAActiveCases().then(() => {
        console.log('✅ LIA active cases loaded from Google Sheets');
    }).catch(error => {
        console.warn('⚠️ Failed to load LIA active cases:', error);
    });
} 