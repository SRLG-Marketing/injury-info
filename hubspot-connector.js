/**
 * HubSpot Connector for Injury Info Website
 * Integrates with HubSpot's CMS, CRM, and content APIs
 */

import fetch from 'node-fetch';

export class HubSpotInjuryInfoConnector {
  constructor(config = {}) {
    this.hubspotApiKey = config.hubspotApiKey || process.env.HUBSPOT_ACCESS_TOKEN;
    this.hubspotPortalId = config.hubspotPortalId || process.env.HUBSPOT_PORTAL_ID;
    this.baseUrl = 'https://api.hubapi.com';
    this.headers = {
      'Authorization': `Bearer ${this.hubspotApiKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Search for disease/condition content in HubSpot CMS
   */
  async searchDiseases(query, category = null, limit = 10) {
    try {
      // For now, return empty array since CMS content may not be set up
      // This prevents API errors while the HubSpot setup is in progress
      console.log(`📋 HubSpot disease search not yet configured for query: ${query}`);
      return [];

    } catch (error) {
      console.error('HubSpot disease search error:', error);
      return [];
    }
  }

  /**
   * Find law firms stored in HubSpot CRM as companies
   */
  async findLawFirms(specialty, location = null, limit = 10) {
    try {
      // For now, return empty array since custom properties may not be set up
      // This prevents API errors while the HubSpot setup is in progress
      console.log(`📋 HubSpot law firm search not yet configured for specialty: ${specialty}`);
      return [];

    } catch (error) {
      console.error('HubSpot law firm search error:', error);
      return [];
    }
  }

  /**
   * Get manufacturer negligence data from HubSpot custom objects
   */
  async getManufacturerCases(manufacturer, product = null) {
    try {
      // For now, return empty array since custom objects may not be set up
      // This prevents API errors while the HubSpot setup is in progress
      console.log(`📋 HubSpot manufacturer cases not yet configured for manufacturer: ${manufacturer}`);
      return [];

    } catch (error) {
      console.error('HubSpot manufacturer case search error:', error);
      return [];
    }
  }

  /**
   * Get settlement data from HubSpot for calculations
   */
  async getSettlementData(condition, state = null) {
    try {
      // For now, return empty array since custom objects may not be set up
      // This prevents API errors while the HubSpot setup is in progress
      console.log(`📋 HubSpot settlement data not yet configured for condition: ${condition}`);
      return [];

    } catch (error) {
      console.error('HubSpot settlement data error:', error);
      return [];
    }
  }

  /**
   * Track user interactions and store as HubSpot contacts/interactions
   */
  async trackUserInteraction(userInfo, queryData) {
    try {
      // Create or update contact in HubSpot
      const contactData = {
        properties: {
          email: userInfo.email || `anonymous_${Date.now()}@temp.com`,
          firstname: userInfo.firstName || 'Anonymous',
          lastname: userInfo.lastName || 'User',
          injury_condition_searched: queryData.condition,
          law_firm_location_searched: queryData.location,
          settlement_calculation_requested: queryData.settlementRequested,
          last_interaction_date: new Date().toISOString(),
          lead_source: 'AI Assistant'
        }
      };

      const contactUrl = `${this.baseUrl}/crm/v3/objects/contacts`;
      
      const response = await fetch(contactUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(contactData)
      });

      if (response.ok) {
        console.log('User interaction tracked in HubSpot');
      }

    } catch (error) {
      console.error('HubSpot contact tracking error:', error);
    }
  }

  /**
   * Get legal timeline data from HubSpot CMS or custom objects
   */
  async getLegalTimeline(state, injuryType) {
    try {
      // Search for legal timeline content in HubSpot
      const searchUrl = `${this.baseUrl}/cms/v3/pages/search`;
      
      const searchBody = {
        query: `legal timeline ${state} ${injuryType}`,
        limit: 5,
        contentTypes: ['landing-page', 'website-page']
      };

      const response = await fetch(searchUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(searchBody)
      });

      const data = await response.json();

      if (data.results.length > 0) {
        const page = data.results[0];
        return {
          state: state,
          injuryType: injuryType,
          statuteOfLimitations: this.extractStatuteFromContent(page.postBody, state),
          typicalTimeline: this.extractTimelineFromContent(page.postBody),
          sourceUrl: page.url
        };
      }

      // Fallback to default timeline data
      return this.getDefaultLegalTimeline(state, injuryType);

    } catch (error) {
      console.error('HubSpot legal timeline error:', error);
      return this.getDefaultLegalTimeline(state, injuryType);
    }
  }

  // Helper methods for content extraction
  extractDiseaseNameFromTitle(title) {
    // Extract disease name from page title
    return title.replace(/\s*(Information|Guide|Overview)\s*$/i, '').trim();
  }

  extractCategoryFromTags(tags) {
    // Map HubSpot tags to categories
    const categoryMap = {
      'cancer': 'Cancer',
      'lung-disease': 'Lung Disease',
      'occupational-disease': 'Occupational Disease'
    };
    
    for (const tag of tags || []) {
      if (categoryMap[tag.toLowerCase()]) {
        return categoryMap[tag.toLowerCase()];
      }
    }
    return 'Other';
  }

  cleanHtmlContent(html) {
    // Remove HTML tags and clean up content
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  extractSymptomsFromContent(content) {
    // Extract symptoms from structured content
    const symptomsMatch = content.match(/symptoms?[:\s]+([^\.]+)/i);
    return symptomsMatch ? symptomsMatch[1].split(',').map(s => s.trim()) : [];
  }

  extractCausesFromContent(content) {
    // Extract causes from structured content
    const causesMatch = content.match(/causes?[:\s]+([^\.]+)/i);
    return causesMatch ? causesMatch[1].split(',').map(c => c.trim()) : [];
  }

  extractManufacturersFromContent(content) {
    // Extract manufacturer names from content
    const manufacturersMatch = content.match(/manufacturers?[:\s]+([^\.]+)/i);
    return manufacturersMatch ? manufacturersMatch[1].split(',').map(m => m.trim()) : [];
  }

  extractStatuteFromContent(content, state) {
    // Extract statute of limitations from content
    const statutes = {
      'california': { personal: 2, discovery: 1 },
      'new york': { personal: 3, discovery: 3 },
      'texas': { personal: 2, discovery: 2 },
      'florida': { personal: 4, discovery: 2 }
    };
    return statutes[state.toLowerCase()] || { personal: 2, discovery: 1 };
  }

  extractTimelineFromContent(content) {
    // Extract case timeline from content
    return {
      consultation: 0,
      investigation: 3,
      filing: 6,
      discovery: 12,
      settlement: 18
    };
  }

  getDefaultSettlementRanges(condition) {
    const ranges = {
      'mesothelioma': { min: 1200000, max: 2400000 },
      'silicosis': { min: 500000, max: 1500000 },
      'asbestosis': { min: 300000, max: 800000 }
    };
    return ranges[condition.toLowerCase()] || { min: 100000, max: 500000 };
  }

  getDefaultLegalTimeline(state, injuryType) {
    return {
      state: state,
      injuryType: injuryType,
      statuteOfLimitations: { personal: 2, discovery: 1 },
      typicalTimeline: {
        consultation: 0,
        investigation: 3,
        filing: 6,
        discovery: 12,
        settlement: 18
      }
    };
  }

  /**
   * Log keyword queries as contact notes for analytics
   * This approach is lightweight and doesn't clutter the main contact record
   */
  async logKeywordQuery(query, source = 'chatbot') {
    try {
      if (!this.hubspotApiKey) {
        console.log('⚠️ HubSpot API key not available for query logging');
        return;
      }

      console.log(`🔍 Attempting to log query: "${query}" to HubSpot...`);

      // Determine analytics email based on environment variable or fallback
      const domain = process.env.ANALYTICS_EMAIL_DOMAIN || 'yourdomain.com';
      const analyticsEmail = `analytics@${domain}`;

      // Create a simple note with timestamp and query
      const noteContent = `Keyword Query: "${query}"\nSource: ${source}\nTimestamp: ${new Date().toISOString()}`;
      
      // For now, we'll create a generic contact or use a specific one
      // You can update this later to use actual user contact info
      const contactData = {
        properties: {
          email: analyticsEmail, // Dynamic email for analytics
          firstname: 'Analytics',
          lastname: 'User'
        }
      };

      console.log('📝 Creating/updating HubSpot contact...');
      
      // Create or update contact
      const contactResponse = await fetch(`${this.baseUrl}/crm/v3/objects/contacts`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(contactData)
      });

      let contactId;

      if (contactResponse.status === 409) {
        // Contact already exists - extract the ID from the error message
        const errorData = await contactResponse.json();
        const match = errorData.message.match(/Existing ID: (\d+)/);
        if (match) {
          contactId = match[1];
          console.log(`✅ Using existing contact: ${contactId}`);
        } else {
          console.error('❌ Could not extract contact ID from 409 error');
          return null;
        }
      } else if (!contactResponse.ok) {
        const errorText = await contactResponse.text();
        console.error(`❌ HubSpot contact creation failed: ${contactResponse.status} - ${errorText}`);
        return null;
      } else {
        const contactResult = await contactResponse.json();
        contactId = contactResult.id;
        console.log(`✅ Contact created: ${contactId}`);
      }

      // Add the note
      const noteData = {
        properties: {
          hs_note_body: noteContent,
          hs_timestamp: new Date().toISOString()
        },
        associations: [
          {
            to: {
              id: contactId
            },
            types: [
              {
                associationCategory: "HUBSPOT_DEFINED",
                associationTypeId: 202
              }
            ]
          }
        ]
      };

      console.log('📝 Creating HubSpot note...');
      
      const noteResponse = await fetch(`${this.baseUrl}/crm/v3/objects/notes`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(noteData)
      });

      if (!noteResponse.ok) {
        const errorText = await noteResponse.text();
        console.error(`❌ HubSpot note creation failed: ${noteResponse.status} - ${errorText}`);
        return null;
      }

      const noteResult = await noteResponse.json();
      
      console.log(`✅ Logged keyword query: "${query}" to HubSpot contact ${contactId}, note ${noteResult.id}`);
      return contactId;

    } catch (error) {
      console.error('❌ Error logging keyword query to HubSpot:', error.message);
      console.error('Full error:', error);
      return null;
    }
  }

  /**
   * Batch log multiple keyword queries (for hourly batches)
   */
  async batchLogKeywordQueries(queries, source = 'chatbot') {
    try {
      if (!this.hubspot) {
        console.log('⚠️ HubSpot connector not available for batch logging');
        return;
      }

      // Create a summary note with all queries
      const timestamp = new Date().toISOString();
      const queryList = queries.map(q => `- "${q}"`).join('\n');
      
      const noteContent = `Keyword Query Batch (${queries.length} queries)\nSource: ${source}\nTimestamp: ${timestamp}\n\nQueries:\n${queryList}`;
      
      // Determine analytics email based on environment variable or fallback
      const domain = process.env.ANALYTICS_EMAIL_DOMAIN || 'yourdomain.com';
      const analyticsEmail = `analytics@${domain}`;

      // For now, we'll create a generic contact or use a specific one
      // You can update this later to use actual user contact info
      const contactData = {
        properties: {
          email: analyticsEmail, // Dynamic email for analytics
          firstname: 'Analytics',
          lastname: 'User'
        }
      };

      console.log('📝 Creating/updating HubSpot contact for batch...');
      
      // Create or update contact
      const contactResponse = await fetch(`${this.baseUrl}/crm/v3/objects/contacts`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(contactData)
      });

      let contactId;

      if (contactResponse.status === 409) {
        // Contact already exists - extract the ID from the error message
        const errorData = await contactResponse.json();
        const match = errorData.message.match(/Existing ID: (\d+)/);
        if (match) {
          contactId = match[1];
          console.log(`✅ Using existing contact for batch: ${contactId}`);
        } else {
          console.error('❌ Could not extract contact ID from 409 error');
          return null;
        }
      } else if (!contactResponse.ok) {
        const errorText = await contactResponse.text();
        console.error(`❌ HubSpot contact creation failed: ${contactResponse.status} - ${errorText}`);
        return null;
      } else {
        const contactResult = await contactResponse.json();
        contactId = contactResult.id;
        console.log(`✅ Contact created for batch: ${contactId}`);
      }

      // Add the batch note
      const noteData = {
        properties: {
          hs_note_body: noteContent,
          hs_timestamp: timestamp
        },
        associations: [
          {
            to: {
              id: contactId
            },
            types: [
              {
                associationCategory: "HUBSPOT_DEFINED",
                associationTypeId: 202
              }
            ]
          }
        ]
      };

      console.log('📝 Creating HubSpot batch note...');
      
      const noteResponse = await fetch(`${this.baseUrl}/crm/v3/objects/notes`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(noteData)
      });

      if (!noteResponse.ok) {
        const errorText = await noteResponse.text();
        console.error(`❌ HubSpot batch note creation failed: ${noteResponse.status} - ${errorText}`);
        return null;
      }

      const noteResult = await noteResponse.json();
      
      console.log(`✅ Batch logged ${queries.length} keyword queries to HubSpot contact ${contactId}, note ${noteResult.id}`);
      return contactId;

    } catch (error) {
      console.error('❌ Error batch logging keyword queries to HubSpot:', error.message);
      return null;
    }
  }
}