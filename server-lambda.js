import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { SERVER_AI_CONFIG, createOpenAIRequest, getServerErrorMessage, validateConfiguration, getConfigurationStatus } from './server-ai-config.js';
import { DataIntegrationService } from './data-integration-service.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: SERVER_AI_CONFIG.api.apiKey,
});

// Initialize Data Integration Service
const dataService = new DataIntegrationService();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// API endpoint for OpenAI chat
app.post('/api/chat', async (req, res) => {
  try {
    const { message, systemMessage, options = {} } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('Received chat request:', { message, systemMessage: systemMessage?.substring(0, 100) + '...' });

    // Initialize variables
    let contextData = [];
    let reputableSources = [];
    let liaCaseInfo = null;
    
    // Get context data and reputable sources
    try {
      const articles = await dataService.searchArticles(message);
      const settlements = await dataService.getSettlementData(message);
      
      // Check if this query relates to an LIA active case
      liaCaseInfo = await dataService.checkLIAActiveCase(message);
      
      // Get reputable sources for the query (including LIA sources)
      reputableSources = await dataService.getReputableSources(message, 4);
      
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
    
    // Use the general system message for all cases
    const selectedSystemMessage = systemMessage || SERVER_AI_CONFIG.systemMessages.general;
    
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

        // Send sources as additional content chunks
        if (reputableSources.length > 0) {
          const sourcesText = dataService.formatReputableSourcesForResponse(reputableSources);
          res.write(`data: ${JSON.stringify({ content: sourcesText, type: 'chunk' })}\n\n`, 'utf8');
        }

        if (liaCaseInfo && liaCaseInfo.isActive) {
          const referralMessage = `\n\n➡️ **Legal Injury Advocates is currently accepting new cases. You can start your claim at** [legalinjuryadvocates.com](https://legalinjuryadvocates.com).`;
          res.write(`data: ${JSON.stringify({ content: referralMessage, type: 'chunk' })}\n\n`, 'utf8');
        }

        // Send final metadata
        res.write(`data: ${JSON.stringify({ 
          type: 'complete',
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
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`, 'utf8');
        res.end();
        return;
      }
    }

    // Non-streaming response (existing behavior)
    const completion = await openai.chat.completions.create(openAIRequest);
    let response = completion.choices[0].message.content;
    console.log('OpenAI response received:', response.substring(0, 100) + '...');

    // Add reputable sources to the response
    if (reputableSources.length > 0) {
      const sourcesText = dataService.formatReputableSourcesForResponse(reputableSources);
      response += sourcesText;
    }

    // Add Legal Injury Advocates referral for active cases
    if (liaCaseInfo && liaCaseInfo.isActive) {
      const referralMessage = `\n\n➡️ **Legal Injury Advocates is currently accepting new cases. You can start your claim at** [legalinjuryadvocates.com](https://legalinjuryadvocates.com).`;
      response += referralMessage;
    }

    res.set('Content-Type', 'application/json; charset=utf-8');
    res.json({ 
      response,
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
      details: 'Check your API key in environment variables'
    });
  }
});

// API endpoint to get configuration status
app.get('/api/config/status', (req, res) => {
  try {
    const status = getConfigurationStatus();
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
      validation: status.validation
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

// API endpoint to get reputable sources for a query
app.get('/api/reputable-sources', async (req, res) => {
  try {
    const { query, disease, limit = 4 } = req.query;
    
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

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve individual article pages
app.get('/article/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'article.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    region: process.env.AWS_REGION || 'unknown'
  });
});

// Export for Lambda
export const handler = serverless(app); 