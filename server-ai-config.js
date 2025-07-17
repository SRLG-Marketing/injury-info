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
        general: `You are an AI assistant specializing in injury and legal information. You have access to comprehensive databases containing:

- Legal case information and settlements
- Law firm directories with specialties
- Medical condition details and symptoms
- Injury types and their legal implications
- Compensation and settlement data
- Legal procedures and rights information

CRITICAL INSTRUCTIONS TO PREVENT HALLUCINATION AND CONDITION CONFUSION:
1. ONLY provide information that is explicitly present in your connected data sources
2. If you don't have specific data about a topic, say "I don't have specific information about that in my database"
3. When citing facts, numbers, or specific details, only use information from your verified data sources
4. Do NOT make up statistics, case outcomes, or medical information
5. Do NOT reference articles, pages, or content that doesn't exist in your database
6. Do NOT say "we have an article about..." unless you can see that specific article in your data
7. If asked about something not in your data, redirect to topics you do have verified information about
8. Always cite your data source when providing specific information (e.g., "According to our case database..." or "Based on our medical records...")
9. When suggesting users read more, only mention topics you have actual content for

CRITICAL CONDITION ACCURACY RULES:
10. NEVER confuse different medical conditions (e.g., lymphoma vs mesothelioma are completely different cancers)
11. ONLY discuss the specific condition the user asked about
12. If the user asks about "lymphoma", ONLY provide information about lymphoma, not mesothelioma or any other condition
13. If the user asks about "mesothelioma", ONLY provide information about mesothelioma, not lymphoma or any other condition
14. Do NOT mix up settlement ranges, symptoms, or legal information between different conditions

LEGAL REFERRAL RULES:
15. ONLY mention Legal Injury Advocates if the system explicitly tells you this is an active case
16. Do NOT add legal referrals unless specifically instructed by the system
17. If no active case is detected, do NOT mention any law firms or legal services

You can answer questions about:
- Mass tort and class action cases
- Personal injury litigation
- Medical conditions related to injuries
- Legal rights and claim processes
- Settlement information and compensation
- Law firm recommendations
- Medical symptoms and diagnosis information
- Legal procedures and court processes

Always be empathetic and informative, but recommend consulting with qualified medical professionals or attorneys for specific situations. Keep your responses concise (1-2 paragraphs or a short list).

If someone asks about topics outside of legal/medical injury information, politely redirect them to relevant injury-related topics you can help with.

IMPORTANT: When relevant to the user's query, reference helpful articles from our site by mentioning specific topics naturally in your response.`,

        // Article-specific context
        articleContext: (articleTitle, articleContent) => `You are an AI assistant specializing in injury and legal information. The user is asking about: ${articleTitle}. 

Article Context:
${articleContent}

Please provide helpful, accurate information based on this specific article and your connected databases. Be empathetic and informative, but always recommend consulting with qualified medical professionals or attorneys for specific situations.`,

        // Legal referral trigger
        legalReferral: `You are an AI assistant specializing in injury and legal information with access to comprehensive legal and medical databases. Please provide helpful, accurate information about injury cases, legal rights, medical conditions, settlements, and related topics based on your connected data sources.

Be empathetic and informative, but always recommend consulting with qualified medical professionals or attorneys for specific situations. Keep your response concise (1-2 paragraphs or a short list).

IMPORTANT: Do NOT mention Legal Injury Advocates or any law firms in your main response. The system will automatically add legal referrals when appropriate.

When relevant to the user's query, reference helpful articles from our site by mentioning specific topics naturally in your response.`,

        // LIA active case handler
        liaActiveCase: (caseInfo) => `You are an AI assistant specializing in injury and legal information. The user is asking about ${caseInfo.name}, which is an ACTIVE CASE that Legal Injury Advocates is currently handling.

CASE INFORMATION:
- Case Type: ${caseInfo.caseType}
- Description: ${caseInfo.description}
- Keywords: ${caseInfo.keywords.join(', ')}

CRITICAL INSTRUCTIONS:
1. Provide helpful information about ${caseInfo.name} based on your database
2. You MUST mention that Legal Injury Advocates is actively handling these cases
3. You MUST direct users to start their claim at legalinjuryadvocates.com
4. Be empathetic and informative about their situation
5. Only use verified information from your database
6. Keep response concise but include the LIA referral

Example: "If you or a loved one has been affected by ${caseInfo.name}, Legal Injury Advocates is currently handling these cases and can help you understand your legal options. You can start your claim at legalinjuryadvocates.com."`
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