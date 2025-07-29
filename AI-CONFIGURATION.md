# AI Configuration Documentation

This document explains the centralized AI configuration system used across the injury information application.

## Overview

All AI parameters, system messages, and settings are now centralized in configuration files to ensure consistency across all parts of the application.

## Configuration Files

### 1. `ai-config.js` (Client-side)
Contains all AI configuration for client-side components:
- OpenAI API settings (model, temperature, max_tokens)
- System messages for different contexts
- Legal referral keywords and messages
- Error messages
- UI settings
- Helper functions for API requests, error handling, and markdown conversion

### 2. `server-ai-config.js` (Server-side)
Contains server-side AI configuration:
- OpenAI API settings
- System messages
- Error handling
- Helper functions for creating OpenAI requests

## Key Features

### Centralized System Messages
- **General**: Standard injury and legal information assistant
- **Article Context**: Context-aware responses for specific articles
- **Legal Referral**: Enhanced prompts that include legal referral triggers

### No LIA Mentions
The AI is configured to NOT mention Legal Injury Advocates or any specific law firm in responses. This ensures responses focus on medical and legal information without firm-specific referrals.

### Enhanced Markdown Support
The centralized markdown converter supports:
- **Bold text**: `**text**` or `__text__`
- **Italic text**: `*text*` or `_text_`
- **Numbered lists**: `1. item`
- **Bullet lists**: `- item`, `* item`, `• item`
- **Line breaks and paragraphs**
- **Automatic paragraph wrapping**

### Consistent Error Handling
Standardized error messages for:
- API key authentication failures
- Rate limit exceeded
- Service unavailability
- Connection failures
- Generic errors

## Usage Examples

### Client-side (index.html, article.html)
```javascript
// Use centralized configuration
const response = await chatbot.sendMessage(query, {
    systemMessage: AI_CONFIG.systemMessages.general,
    max_tokens: 400
});

// Markdown is automatically converted to HTML
```

### Server-side (server.js)
```javascript
// Use centralized configuration for OpenAI requests
const openAIRequest = createOpenAIRequest(messages, options);
const completion = await openai.chat.completions.create(openAIRequest);

// Use centralized error handling
const errorMessage = getServerErrorMessage(error);
```

## Benefits

1. **Consistency**: All AI interactions use the same parameters and messages
2. **Maintainability**: Changes to AI behavior only need to be made in one place
3. **Reliability**: Standardized error handling and response formatting
4. **Scalability**: Easy to add new AI features or modify existing ones
5. **Natural Responses**: Organic mentions of Legal Injury Advocates when relevant without forced referrals

## Files Using AI Configuration

### Client-side Files:
- `index.html` - Main injury info site with AI chatbot
- `article.html` - Individual article pages with AI chat
- `src/chatbot-interface.html` - Standalone chatbot interface

### Server-side Files:
- `server.js` - Main server with OpenAI API integration

## Making Changes

To modify AI behavior:

1. **System Messages**: Update the appropriate message in `AI_CONFIG.systemMessages`
2. **API Parameters**: Modify settings in `AI_CONFIG.api`
3. **Legal Referrals**: Update keywords in `AI_CONFIG.formatting.legalReferralKeywords`
4. **Error Messages**: Edit messages in `AI_CONFIG.errors`
5. **UI Text**: Update settings in `AI_CONFIG.ui`

All changes will automatically apply to all parts of the application that use the AI system. 