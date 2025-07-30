import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { SERVER_AI_CONFIG, createOpenAIRequest, getServerErrorMessage, validateConfiguration, getConfigurationStatus } from './server-ai-config.js';
import { AI_CONFIG } from './ai-config.js';
import { DataIntegrationService } from './data-integration-service.js';
import { DataVerificationMiddleware } from './data-verification-middleware.js';
import { getBaseUrl, getApiBaseUrl } from './utils/url-helper.js';
import { QueryTracker } from './utils/query-tracker.js';
import { HubSpotInjuryInfoConnector } from './hubspot-connector.js';
import queryAnalyticsRouter from './api/query-analytics.js';

import { getCorsOrigins } from './config/server-urls.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: SERVER_AI_CONFIG.api.apiKey,
});

// Initialize Data Integration Service
const dataService = new DataIntegrationService();

// Initialize Data Verification Middleware
const verificationMiddleware = new DataVerificationMiddleware();

// Initialize HubSpot Connector
const hubspotConnector = new HubSpotInjuryInfoConnector();

// Initialize Query Tracker with HubSpot integration
const queryTracker = new QueryTracker({
    hubspotConnector,
    enableHubSpotTracking: process.env.ENABLE_HUBSPOT_TRACKING !== 'false',
    enableFileLogging: process.env.ENABLE_FILE_LOGGING !== 'false',
    batchSize: parseInt(process.env.QUERY_BATCH_SIZE) || 10,
    batchTimeout: parseInt(process.env.QUERY_BATCH_TIMEOUT) || 60000
});

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = getCorsOrigins();
    
    // Check if origin is explicitly allowed
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Check wildcard patterns
    for (const pattern of allowedOrigins) {
      if (pattern.includes('*')) {
        const regexPattern = pattern.replace(/\*/g, '.*');
        if (new RegExp(regexPattern).test(origin)) return callback(null, true);
      }
    }
    
    // Special handling for HubSpot sandbox domains
    if (origin.includes('hs-sites.com') || origin.includes('hubspot.com')) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Cache-Control',
    'Pragma',
    'Expires',
    'Accept',
    'Accept-Language',
    'Accept-Encoding',
    'DNT',
    'Connection',
    'Upgrade-Insecure-Requests',
    'User-Agent',
    'Sec-Fetch-Dest',
    'Sec-Fetch-Mode',
    'Sec-Fetch-Site',
    'Sec-Fetch-User'
  ]
}));
app.use(express.json());

// Handle CORS preflight requests more comprehensively
app.options('*', cors({
  origin: getCorsOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Cache-Control',
    'Pragma',
    'Expires',
    'Accept',
    'Accept-Language',
    'Accept-Encoding',
    'DNT',
    'Connection',
    'Upgrade-Insecure-Requests',
    'User-Agent',
    'Sec-Fetch-Dest',
    'Sec-Fetch-Mode',
    'Sec-Fetch-Site',
    'Sec-Fetch-User'
  ]
}));

// Serve static files from public directory (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
}

// Mount analytics API routes
app.use('/api/analytics', queryAnalyticsRouter);

// API endpoint for OpenAI chat
app.post('/api/chat', async (req, res) => {
  const startTime = Date.now();
  try {
    const { message, systemMessage, options = {} } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get the base URL from the request
    const baseUrl = getBaseUrl(req);
    const apiBaseUrl = getApiBaseUrl(req);

    console.log('Received chat request:', { 
      message, 
      baseUrl,
      apiBaseUrl
    });

    // Prepare tracking context for enhanced analytics
    const trackingContext = {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || req.connection.remoteAddress,
      sessionId: req.session?.id || 'unknown',
      pageUrl: req.get('Referer') || '',
      referrer: req.get('Referer') || ''
    };

    // Get relevant data for context
    let contextData = [];
    let liaCaseInfo = null;
    let reputableSources = [];
    try {
      const articles = await dataService.searchArticles(message);
      const settlements = await dataService.getSettlementData(message);
      
      // Check if this query relates to an LIA active case
      liaCaseInfo = await dataService.checkLIAActiveCase(message);
      
      // Get reputable sources for the query
                  reputableSources = await dataService.getReputableSources(message, 5);
      
      // Smart law firm inclusion - only for legal-related queries (expanded for environmental/toxic exposure cases)
      const isLegalQuery = /\b(lawyer|attorney|legal|firm|representation|claim|lawsuit|compensation|settlement|case|court|litigation|sue|suing|damages|verdict|jury|judge|trial|contaminated|contamination|exposure|exposed|cancer|harm|injury|injured|affected|victims|toxic|poisoning|illness|disease|negligence|liable|liability|wrongful|malpractice|class action|mass tort)\b/i.test(message);
      
      // Get law firms with smart filtering based on the query
      const lawFirms = isLegalQuery ? await dataService.getLawFirms(message) : [];
      
      // Debug: Log which firms were selected
      if (isLegalQuery && lawFirms.length > 0) {
        console.log(`🔍 Smart filtering found ${lawFirms.length} relevant law firms:`);
        lawFirms.forEach((firm, index) => {
          console.log(`  ${index + 1}. ${firm.name} (${firm.location}) - Specialties: ${firm.specialties.join(', ')}`);
        });
      }
      
      // Anonymize law firm data - remove contact info and websites
      const sanitizedLawFirms = isLegalQuery ? lawFirms.slice(0, 3).map(firm => ({
        name: firm.name,
        location: firm.location,
        specialties: firm.specialties,
        experience: firm.experience,
        successRate: firm.successRate,
        notableSettlements: firm.notableSettlements,
        source: 'law_firm_directory'
        // Removed: website, phone, direct contact info
      })) : [];
      
      contextData = [
        ...articles.slice(0, 3), // Top 3 relevant articles
        ...settlements.slice(0, 2), // Top 2 settlement data
        ...sanitizedLawFirms // Top 2 relevant law firms (legal queries only, no contact info)
      ];
      
      // Log context data for debugging
      if (sanitizedLawFirms.length > 0) {
        console.log(`📊 Including ${sanitizedLawFirms.length} law firms in context for legal query`);
        console.log('📋 Law firm data:', JSON.stringify(sanitizedLawFirms, null, 2));
      } else {
        console.log('📋 No law firm data included - query did not trigger legal detection');
        console.log('📋 Legal query test result:', isLegalQuery);
      }
    } catch (error) {
      console.warn('Could not fetch context data:', error.message);
    }

    // Prepare messages for OpenAI
    const messages = [];
    
    // Use the general system message for all cases to prevent specific referral generation
    const selectedSystemMessage = SERVER_AI_CONFIG.systemMessages.general;
    
    messages.push({
      role: 'system',
      content: selectedSystemMessage
    });
    


    // Add context data if available
    if (contextData.length > 0) {
      let contextMessage = '';
      
      if (contextData.length > 0) {
        contextMessage += `RELEVANT DATA FROM OUR DATABASE:\n${JSON.stringify(contextData, null, 2)}\n\n`;
      }
      
      contextMessage += `\n\nUser Question: ${message}\n\nCRITICAL INSTRUCTIONS: 
      1. ANALYZE the provided data above and USE it to answer the question
      2. If law firm data is provided, you HAVE the information needed - use it to provide helpful guidance
      3. Reference actual specialties, locations, and case types from the data
      4. DO NOT mention specific firm names, contact information, or websites
      5. DO NOT say "I don't have specific information" when data is provided above
      6. Focus on geographic coverage, specialties, and case types from the actual data`;
      
      messages.push({
        role: 'user',
        content: contextMessage
      });
    } else {
      messages.push({
        role: 'user',
        content: message
      });
    }

    // Call OpenAI API using centralized configuration
    // Remove systemMessage from options since it's already handled in messages
    const { systemMessage: _, ...openAIOptions } = options;
    const openAIRequest = createOpenAIRequest(messages, openAIOptions);
    
    // Check if streaming is requested
    const isStreaming = req.headers.accept === 'text/event-stream';
    
    if (isStreaming) {
      // Set up Server-Sent Events for streaming
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Encoding': 'identity',
      });

      try {
        // Enable streaming in OpenAI request
        const streamRequest = { ...openAIRequest, stream: true };
        const stream = await openai.chat.completions.create(streamRequest);

        let fullResponse = '';
        
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullResponse += content;
            
            // Send each chunk to the client
            res.write(`data: ${JSON.stringify({ content, type: 'chunk' })}\n\n`, 'utf8');
          }
        }

        // Process the full response for sources and referrals
        const verification = await verificationMiddleware.verifyResponse(fullResponse, message);
        
        // Send sources as additional content chunks
        if (reputableSources.length > 0) {
          const sourcesText = dataService.formatReputableSourcesForResponse(reputableSources);
          res.write(`data: ${JSON.stringify({ content: sourcesText, type: 'chunk' })}\n\n`, 'utf8');
        }

        // No automatic referral system - responses are referral-free

        // Send final metadata
        res.write(`data: ${JSON.stringify({ 
          type: 'complete',
          verified: verification.verified,
          warnings: verification.warnings,
          reputableSources: reputableSources.map(source => ({
            title: source.sourceTitle,
            url: source.sourceUrl,
            type: source.sourceType,
            priority: source.priority
          })),
          liaCase: liaCaseInfo && liaCaseInfo.isActive ? {
            isActive: true,
            caseType: liaCaseInfo.caseType,
            name: liaCaseInfo.name,
            description: liaCaseInfo.description,
            keywords: liaCaseInfo.keywords
          } : null
        })}\n\n`, 'utf8');
        
        res.write(`data: [DONE]\n\n`, 'utf8');
        res.end();
        return;
        
      } catch (error) {
        console.error('OpenAI streaming error:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', error: getServerErrorMessage(error) })}\n\n`, 'utf8');
        res.end();
        return;
      }
    }

    // Non-streaming response (existing behavior)
    const completion = await openai.chat.completions.create(openAIRequest);
    const aiResponse = completion.choices[0].message.content;
    console.log('OpenAI response received:', aiResponse.substring(0, 100) + '...');


    // Verify response against data sources
    const verification = await verificationMiddleware.verifyResponse(aiResponse, message);
    
    // Add reputable sources to the response
    let responseWithSources = verification.response;
    if (reputableSources.length > 0) {
      const sourcesText = dataService.formatReputableSourcesForResponse(reputableSources);
      responseWithSources += sourcesText;
    }
    
    // No automatic referral messages - system is referral-free
    

    
    // No automatic referral system - responses are referral-free
    
    // No automatic referral system - responses are referral-free
    

    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Enhanced tracking with response data
    queryTracker.trackQuery({
      query: message,
      source: 'chatbot',
      responseTime,
      sourcesFound: reputableSources.length,
      articlesFound: contextData.filter(item => item.type === 'article').length,
      lawFirmsFound: contextData.filter(item => item.type === 'law_firm').length,
      settlementsFound: contextData.filter(item => item.type === 'settlement').length,
      isLegalQuery: /\b(lawyer|attorney|legal|firm|representation|claim|lawsuit|compensation|settlement|case|court|litigation|sue|suing|damages|verdict|jury|judge|trial|contaminated|contamination|exposure|exposed|cancer|harm|injury|injured|affected|victims|toxic|poisoning|illness|disease|negligence|liable|liability|wrongful|malpractice|class action|mass tort)\b/i.test(message),
      liaCaseType: liaCaseInfo?.caseType || null,
      liaCaseInfo: liaCaseInfo || null,
      ...trackingContext
    }).catch(error => {
      console.warn('Could not track enhanced query data:', error.message);
    });

    res.set('Content-Type', 'application/json; charset=utf-8');
    res.json({ 
      response: responseWithSources,
      verified: verification.verified,
      warnings: verification.warnings,
      claimsVerified: verification.claimsVerified,
      reputableSources: reputableSources.map(source => ({
        title: source.sourceTitle,
        url: source.sourceUrl,
        type: source.sourceType,
        priority: source.priority
      })),
      liaCase: liaCaseInfo && liaCaseInfo.isActive ? {
        isActive: true,
        caseType: liaCaseInfo.caseType,
        name: liaCaseInfo.name,
        description: liaCaseInfo.description,
        keywords: liaCaseInfo.keywords
      } : null,
      apiBaseUrl: apiBaseUrl,
      usage: completion.usage 
    });

  } catch (error) {
    console.error('OpenAI API error:', error);
    
    const errorMessage = getServerErrorMessage(error);
    const statusCode = error.status || 500;
    
    res.status(statusCode).json({ error: errorMessage });
  }
});

// API endpoint to get article data
app.get('/api/articles', async (req, res) => {
  try {
    const articles = await dataService.getAllArticles();
    res.json(articles);
  } catch (error) {
    console.error('❌ Error fetching articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// API endpoint to get a specific article by slug
app.get('/api/articles/:slug', async (req, res) => {
  const { slug } = req.params;
  
  try {
    const articles = await dataService.getAllArticles();
    let article = articles.find(a => a.slug === slug);
    
    // If not found in main data, check fallback articles
    if (!article) {
      const fallbackArticles = dataService.getFallbackArticles();
      article = fallbackArticles.find(a => a.slug === slug);
    }
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    res.json(article);
  } catch (error) {
    console.error('❌ Error fetching article:', error);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

// API endpoint to search for law firms
app.get('/api/law-firms', async (req, res) => {
  try {
    const { specialty, location } = req.query;
    
    const lawFirms = await dataService.getLawFirms(specialty, location);
    
    res.json(lawFirms);
  } catch (error) {
    console.error('❌ Error fetching law firms:', error);
    res.status(500).json({ error: 'Failed to fetch law firms' });
  }
});

// API endpoint to get settlement data
app.get('/api/settlements', async (req, res) => {
  try {
    const { condition, state } = req.query;
    
    const settlements = await dataService.getSettlementData(condition, state);
    
    res.json(settlements);
  } catch (error) {
    console.error('❌ Error fetching settlement data:', error);
    res.status(500).json({ error: 'Failed to fetch settlement data' });
  }
});

// API endpoint to search for comprehensive condition information
app.get('/api/search/:condition', async (req, res) => {
  try {
    const { condition } = req.params;
    
    const result = await dataService.searchCondition(condition);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error searching condition:', error);
    res.status(500).json({ error: 'Failed to search condition' });
  }
});

// API endpoint to get reputable sources for a query
app.get('/api/reputable-sources', async (req, res) => {
  try {
    const { query, disease, limit = 3 } = req.query;
    
    if (!query && !disease) {
      return res.status(400).json({ error: 'Either query or disease parameter is required' });
    }
    
    let sources = [];
    
    if (query) {
      sources = await dataService.getReputableSources(query, parseInt(limit));
    } else if (disease) {
      sources = await dataService.getReputableSourcesForDisease(disease, parseInt(limit));
    }
    
    res.json({
      sources: sources.map(source => ({
        id: source.id,
        diseaseAilment: source.diseaseAilment,
        sourceTitle: source.sourceTitle,
        sourceUrl: source.sourceUrl,
        sourceType: source.sourceType,
        priority: source.priority,
        description: source.description,
        lastUpdated: source.lastUpdated
      })),
      total: sources.length,
      query: query || disease
    });
  } catch (error) {
    console.error('❌ Error fetching reputable sources:', error);
    res.status(500).json({ error: 'Failed to fetch reputable sources' });
  }
});

// API endpoint to clear cache
app.post('/api/cache/clear', async (req, res) => {
  try {
    dataService.clearCache();
    res.json({ message: 'Cache cleared successfully' });
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// API endpoint to get cache statistics
app.get('/api/cache/stats', async (req, res) => {
  try {
    const stats = dataService.getCacheStats();
    res.json(stats);
  } catch (error) {
    console.error('❌ Error getting cache stats:', error);
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

// Test endpoint to verify API key
app.get('/api/test', async (req, res) => {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Hello, this is a test.' }],
      max_tokens: 50
    });

    res.json({ 
      success: true, 
      message: 'OpenAI API connection successful',
      response: completion.choices[0].message.content 
    });
  } catch (error) {
    console.error('OpenAI test error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: 'Check your API key in .env.local'
    });
  }
});

// API endpoint to get configuration status
app.get('/api/config/status', (req, res) => {
  try {
    const status = getConfigurationStatus();
    const baseUrl = getBaseUrl(req);
    const apiBaseUrl = getApiBaseUrl(req);
    
    // Don't expose sensitive information like API keys
    const safeStatus = {
      openai: {
        configured: status.openai.configured,
        model: status.openai.model
      },
      google: {
        configured: status.google.configured,
        spreadsheetId: status.google.spreadsheetId ? '***configured***' : null
      },
      hubspot: {
        configured: status.hubspot.configured,
        portalId: status.hubspot.portalId
      },
      validation: status.validation,
      verification: {
        enabled: true,
        features: [
          'Response verification against data sources',
          'Claim extraction and validation',
          'Source citation',
          'Unverified claim removal'
        ]
      },
      lia: {
        enabled: true,
        features: [
          'Active case detection from Google Sheets',
          'Automatic referrals for active cases',
          'Referral-free for inactive cases',
          'Medical and legal information provided'
        ]
      },
      urls: {
        baseUrl,
        apiBaseUrl,
        environment: process.env.NODE_ENV || 'development'
      }
    };
    
    res.json(safeStatus);
  } catch (error) {
    console.error('❌ Error getting configuration status:', error);
    res.status(500).json({ error: 'Failed to get configuration status' });
  }
});

// API endpoint to get LIA active cases
app.get('/api/lia/active-cases', async (req, res) => {
  try {
    const liaData = await dataService.getLIAActiveCases();
    
    res.json({
      ...liaData,
      message: liaData.source === 'fallback' ? 'Using fallback data - Google Sheets not available' : 'Data loaded from Google Sheets'
    });
  } catch (error) {
    console.error('❌ Error getting LIA active cases:', error);
    res.status(500).json({ error: 'Failed to get LIA active cases' });
  }
});

// API endpoint to check if a query relates to LIA active cases
app.post('/api/lia/check-case', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    const result = await dataService.checkLIAActiveCase(query);
    
    res.json({
      query,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error in LIA case check:', error);
    res.status(500).json({ error: 'Failed to check LIA case' });
  }
});

// API endpoint to get query analytics
app.get('/api/analytics/queries', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const analytics = await dataService.getQueryAnalytics(parseInt(days));
    
    res.json(analytics);
  } catch (error) {
    console.error('❌ Error fetching query analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// API endpoint to export query analytics as CSV
app.get('/api/analytics/export', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    // Import the QueryLogger dynamically
    const { QueryLogger } = await import('./utils/query-logger.js');
    const queryLogger = new QueryLogger();
    
    const result = await queryLogger.exportToCSV(parseInt(days));
    
    if (!result.success) {
      return res.status(500).json({ error: 'Failed to export analytics' });
    }
    
    // Send the CSV file
    res.download(result.file, `query-analytics-${new Date().toISOString().split('T')[0]}.csv`);
    
  } catch (error) {
    console.error('❌ Error exporting analytics:', error);
    res.status(500).json({ error: 'Failed to export analytics' });
  }
});

// API endpoint to verify if an article exists
app.post('/api/verify-article', async (req, res) => {
  try {
    const { articleTitle } = req.body;
    
    if (!articleTitle) {
      return res.status(400).json({ error: 'Article title is required' });
    }
    
    const verification = await verificationMiddleware.verifyArticleExists(articleTitle);
    
    res.json({
      articleTitle,
      exists: verification.exists,
      similarity: verification.similarity,
      article: verification.article ? {
        id: verification.article.id,
        title: verification.article.title,
        slug: verification.article.slug,
        category: verification.article.category,
        source: verification.article.source
      } : null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error verifying article:', error);
    res.status(500).json({ error: 'Failed to verify article' });
  }
});

// Serve the main HTML file (development only)
if (process.env.NODE_ENV !== 'production') {
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // Serve individual article pages (development only)
  app.get('/article/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'article.html'));
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📁 Serving files from: ${__dirname}`);
  
  // Configuration status check
  const configStatus = getConfigurationStatus();
  console.log('🔧 Configuration Status:');
  console.log(`   OpenAI: ${configStatus.openai.configured ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   Google Sheets: ${configStatus.google.configured ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   HubSpot: ${configStatus.hubspot.configured ? '✅ Configured' : '❌ Missing'}`);
  
  if (!configStatus.validation.isValid) {
    console.log('⚠️  Configuration Issues:');
    configStatus.validation.errors.forEach(error => {
      console.log(`   - ${error}`);
    });
  }
  
  console.log('📊 Available endpoints:');
  console.log('   GET  /api/config/status - Configuration status');
  console.log('   POST /api/chat - OpenAI chat (with verification)');
  console.log('   GET  /api/articles - Get all articles');
  console.log('   GET  /api/articles/:slug - Get specific article');
  console.log('   GET  /api/law-firms - Search law firms');
  console.log('   GET  /api/settlements - Get settlement data');
  console.log('   GET  /api/search/:condition - Search condition info');
  console.log('   POST /api/cache/clear - Clear cache');
  console.log('   GET  /api/cache/stats - Get cache statistics');
  console.log('   GET  /api/test - Test OpenAI connection');
  console.log('   GET  /api/lia/active-cases - Get LIA active cases');
  console.log('   POST /api/lia/check-case - Check if a query relates to LIA active cases');
  console.log('   POST /api/verify-article - Verify if an article exists');
});

export default app; 