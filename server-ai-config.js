// Server-side AI Configuration
// This file contains all AI parameters and settings used by the server

import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

export const SERVER_AI_CONFIG = {
    // OpenAI API Settings
    api: {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
        max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 500
    },

    // Google Sheets Configuration
    google: {
        apiKey: process.env.GOOGLE_API_KEY,
        spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID
    },

    // HubSpot Configuration
    hubspot: {
        accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
        portalId: process.env.HUBSPOT_PORTAL_ID
    },

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

IMPORTANT: DO NOT include any specific referral messages - the system will add the generic referral automatically when appropriate.`,

        // Active case handler (generic)
        activeCase: (caseInfo) => `You are an AI assistant specializing in injury and legal information. The user is asking about ${caseInfo.name}, which is an active legal case.

CASE INFORMATION:
- Case Type: ${caseInfo.caseType}
- Description: ${caseInfo.description}
- Keywords: ${caseInfo.keywords.join(', ')}

CRITICAL INSTRUCTIONS:
1. Provide helpful information about ${caseInfo.name} based on your database
2. Be empathetic and informative about their situation
3. Only use verified information from your database
4. Keep response concise and professional
5. DO NOT mention any specific law firms or referral services
6. Focus on medical and legal information, not referrals

IMPORTANT: DO NOT include any referral messages - the system will handle referrals automatically when appropriate.`
    },

    // Error Messages
    errors: {
        connectionFailed: 'Unable to connect to the server. Please make sure the server is running.',
        apiKeyInvalid: 'Invalid API key. Please check your OpenAI API key.',
        rateLimitExceeded: 'Rate limit exceeded. Please try again later.',
        serviceUnavailable: 'OpenAI service error. Please try again later.',
        generic: 'An error occurred while processing your request.'
    }
};

// Helper function to create OpenAI API request
export function createOpenAIRequest(messages, options = {}) {
    // Only include valid OpenAI API parameters
    const request = {
        model: options.model || SERVER_AI_CONFIG.api.model,
        messages: messages,
        temperature: options.temperature || SERVER_AI_CONFIG.api.temperature,
        max_tokens: options.max_tokens || SERVER_AI_CONFIG.api.max_tokens
    };
    
    // Add any other valid OpenAI parameters if needed
    if (options.top_p !== undefined) request.top_p = options.top_p;
    if (options.frequency_penalty !== undefined) request.frequency_penalty = options.frequency_penalty;
    if (options.presence_penalty !== undefined) request.presence_penalty = options.presence_penalty;
    
    return request;
}

// Helper function to get error message based on error type
export function getServerErrorMessage(error) {
    if (error.status === 401) {
        return SERVER_AI_CONFIG.errors.apiKeyInvalid;
    } else if (error.status === 429) {
        return SERVER_AI_CONFIG.errors.rateLimitExceeded;
    } else if (error.status === 500) {
        return SERVER_AI_CONFIG.errors.serviceUnavailable;
    } else {
        return SERVER_AI_CONFIG.errors.generic;
    }
}

// Helper function to validate configuration
export function validateConfiguration() {
    const errors = [];
    
    if (!SERVER_AI_CONFIG.api.apiKey) {
        errors.push('OPENAI_API_KEY is missing');
    }
    
    if (!SERVER_AI_CONFIG.google.apiKey) {
        errors.push('GOOGLE_API_KEY is missing');
    }
    
    if (!SERVER_AI_CONFIG.google.spreadsheetId) {
        errors.push('GOOGLE_SPREADSHEET_ID is missing');
    }
    
    if (!SERVER_AI_CONFIG.hubspot.accessToken) {
        errors.push('HUBSPOT_ACCESS_TOKEN is missing');
    }
    
    if (!SERVER_AI_CONFIG.hubspot.portalId) {
        errors.push('HUBSPOT_PORTAL_ID is missing');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

// Helper function to get configuration status
export function getConfigurationStatus() {
    const validation = validateConfiguration();
    
    return {
        openai: {
            configured: !!SERVER_AI_CONFIG.api.apiKey,
            model: SERVER_AI_CONFIG.api.model
        },
        google: {
            configured: !!SERVER_AI_CONFIG.google.apiKey && !!SERVER_AI_CONFIG.google.spreadsheetId,
            spreadsheetId: SERVER_AI_CONFIG.google.spreadsheetId
        },
        hubspot: {
            configured: !!SERVER_AI_CONFIG.hubspot.accessToken && !!SERVER_AI_CONFIG.hubspot.portalId,
            portalId: SERVER_AI_CONFIG.hubspot.portalId
        },
        validation
    };
} 