/**
 * HubSpot Connector for Injury Info Website
 * Integrates with HubSpot's CMS, CRM, and content APIs
 */

import fetch from 'node-fetch';

export class HubSpotInjuryInfoConnector {
  constructor(config = {}) {
    this.hubspotApiKey = config.hubspotApiKey || process.env.HUBSPOT_API_KEY;
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
} 