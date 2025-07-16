import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { SERVER_AI_CONFIG, createOpenAIRequest, getServerErrorMessage, validateConfiguration, getConfigurationStatus } from './server-ai-config.js';
import { DataIntegrationService } from './data-integration-service.js';
import { DataVerificationMiddleware } from './data-verification-middleware.js';
import { getBaseUrl, getApiBaseUrl } from './utils/url-helper.js';

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

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  console.log('🔧 Development mode: Serving static files from public directory');
}

// API endpoint for OpenAI chat
app.post('/api/chat', async (req, res) => {
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
      systemMessage: systemMessage?.substring(0, 100) + '...',
      baseUrl,
      apiBaseUrl
    });

    // Track user query for analytics (non-blocking)
    const trackingContext = {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || req.connection.remoteAddress,
      sessionId: req.session?.id || 'unknown',
      pageUrl: req.get('Referer') || '',
      referrer: req.get('Referer') || ''
    };
    
    // Track query asynchronously (don't wait for it)
    dataService.trackUserQuery(message, trackingContext).catch(error => {
      console.warn('Could not track user query:', error.message);
    });

    // Get relevant data for context
    let contextData = [];
    let liaCaseInfo = null;
    try {
      const articles = await dataService.searchArticles(message);
      const settlements = await dataService.getSettlementData(message);
      const lawFirms = await dataService.getLawFirms();
      
      // Check if this query relates to an LIA active case
      liaCaseInfo = await dataService.checkLIAActiveCase(message);
      
      contextData = [
        ...articles.slice(0, 3), // Top 3 relevant articles
        ...settlements.slice(0, 2), // Top 2 settlement data
        ...lawFirms.slice(0, 2) // Top 2 law firms
      ];
    } catch (error) {
      console.warn('Could not fetch context data:', error.message);
    }

    // Prepare messages for OpenAI
    const messages = [];
    
    // Use LIA-specific system message if this is an active case
    if (liaCaseInfo && liaCaseInfo.isActive) {
      messages.push({
        role: 'system',
        content: SERVER_AI_CONFIG.systemMessages.liaActiveCase(liaCaseInfo)
      });
    } else if (systemMessage) {
      messages.push({
        role: 'system',
        content: systemMessage
      });
    }

    // Add context data if available
    if (contextData.length > 0 || (liaCaseInfo && liaCaseInfo.isActive)) {
      let contextMessage = '';
      
      if (contextData.length > 0) {
        contextMessage += `RELEVANT DATA FROM OUR DATABASE:\n${JSON.stringify(contextData, null, 2)}\n\n`;
      }
      
      if (liaCaseInfo && liaCaseInfo.isActive) {
        contextMessage += `LIA ACTIVE CASE DETECTED:\nLegal Injury Advocates is currently handling ${liaCaseInfo.name} cases.\nCase Type: ${liaCaseInfo.caseType}\nDescription: ${liaCaseInfo.description}\nKeywords: ${liaCaseInfo.keywords.join(', ')}\n\n`;
        contextMessage += `CRITICAL: Since this relates to an active LIA case, you MUST mention that users can start their claim at legalinjuryadvocates.com.`;
      } else {
        contextMessage += `NO ACTIVE LIA CASE DETECTED:\nThis condition is NOT currently handled by Legal Injury Advocates.\n\n`;
        contextMessage += `CRITICAL: Do NOT mention Legal Injury Advocates or any legal referrals. Only provide general information about the condition.`;
      }
      
      contextMessage += `\n\nUser Question: ${message}\n\nIMPORTANT: Only use information from the provided data or explicitly state when you don't have specific information.`;
      
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
    const completion = await openai.chat.completions.create(openAIRequest);

    const aiResponse = completion.choices[0].message.content;
    console.log('OpenAI response received:', aiResponse.substring(0, 100) + '...');

    // Verify response against data sources
    const verification = await verificationMiddleware.verifyResponse(aiResponse, message);
    
    res.json({ 
      response: verification.response,
      verified: verification.verified,
      warnings: verification.warnings,
      claimsVerified: verification.claimsVerified,
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
    console.log('📊 Fetching articles from data sources...');
    const articles = await dataService.getAllArticles();
    console.log(`✅ Returning ${articles.length} articles`);
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
    console.log(`📄 Fetching article with slug: ${slug}`);
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
    
    console.log(`✅ Found article: ${article.title}`);
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
    console.log(`🏛️ Fetching law firms - specialty: ${specialty}, location: ${location}`);
    
    const lawFirms = await dataService.getLawFirms(specialty, location);
    console.log(`✅ Returning ${lawFirms.length} law firms`);
    
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
    console.log(`💰 Fetching settlement data - condition: ${condition}, state: ${state}`);
    
    const settlements = await dataService.getSettlementData(condition, state);
    console.log(`✅ Returning settlement data for ${condition}`);
    
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
    console.log(`🔍 Searching for comprehensive information about: ${condition}`);
    
    const result = await dataService.searchCondition(condition);
    console.log(`✅ Found information for ${condition}`);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error searching condition:', error);
    res.status(500).json({ error: 'Failed to search condition' });
  }
});

// API endpoint to clear cache
app.post('/api/cache/clear', async (req, res) => {
  try {
    dataService.clearCache();
    console.log('🗑️ Cache cleared');
    res.json({ message: 'Cache cleared successfully' });
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
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
    
    console.log('📊 Configuration status requested');
    
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
          'Automatic LIA case detection',
          'Active case prompting',
          'legalinjuryadvocates.com referrals'
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
    console.log('📊 Fetching LIA active cases from Google Sheets...');
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
    
    console.log(`🔍 Checking LIA active case for query: "${query}"`);
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
    console.log(`📊 Fetching query analytics for last ${days} days`);
    
    const analytics = await dataService.getQueryAnalytics(parseInt(days));
    
    console.log(`✅ Returning analytics: ${analytics.totalQueries} queries, ${analytics.topKeywords.length} top keywords`);
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
    console.log(`📥 Exporting query analytics for last ${days} days`);
    
    // Import the QueryLogger dynamically
    const { QueryLogger } = await import('./utils/query-logger.js');
    const queryLogger = new QueryLogger();
    
    const result = await queryLogger.exportToCSV(parseInt(days));
    
    if (!result.success) {
      return res.status(500).json({ error: 'Failed to export analytics' });
    }
    
    // Send the CSV file
    res.download(result.file, `query-analytics-${new Date().toISOString().split('T')[0]}.csv`);
    console.log(`✅ Exported CSV: ${result.file}`);
    
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
    
    console.log(`🔍 Verifying article: "${articleTitle}"`);
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
  console.log('   GET  /api/test - Test OpenAI connection');
  console.log('   GET  /api/lia/active-cases - Get LIA active cases');
  console.log('   POST /api/lia/check-case - Check if a query relates to LIA active cases');
  console.log('   POST /api/verify-article - Verify if an article exists');
});

export default app; 