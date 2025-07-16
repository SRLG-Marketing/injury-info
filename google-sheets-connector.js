/**
 * Google Sheets Connector for Injury Info MCP Server
 * 
 * This class provides methods to interact with Google Sheets data
 * for law firms, manufacturer cases, and medical information.
 */

import fetch from 'node-fetch';

export class GoogleSheetsConnector {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.spreadsheetId = config.spreadsheetId;
    this.baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
    
    if (!this.apiKey) {
      throw new Error('Google API key is required');
    }
  }

  async makeRequest(endpoint) {
    const url = `${this.baseUrl}${endpoint}&key=${this.apiKey}`;
    
    try {
      const response = await fetch(url);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`Google Sheets API Error: ${response.status} - ${result.error?.message || 'Unknown error'}`);
      }
      
      return result;
    } catch (error) {
      throw new Error(`Google Sheets request failed: ${error.message}`);
    }
  }

  async readSheet(sheetName) {
    console.log(`📊 Reading Google Sheet: ${sheetName}...`);
    
    const endpoint = `/${this.spreadsheetId}/values/${sheetName}?majorDimension=ROWS`;
    const result = await this.makeRequest(endpoint);
    
    if (!result.values || result.values.length === 0) {
      console.log(`⚠️  No data found in sheet: ${sheetName}`);
      return { headers: [], data: [] };
    }
    
    const [headers, ...rows] = result.values;
    const data = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });
    
    console.log(`✅ Read ${data.length} rows from ${sheetName}`);
    return { headers, data };
  }

  async searchSheet(sheetName, query, column = null, limit = 10) {
    const { headers, data } = await this.readSheet(sheetName);
    
    if (data.length === 0) {
      return { results: [], total: 0 };
    }
    
    const searchQuery = query.toLowerCase();
    let filteredData = data;
    
    if (column) {
      // Search in specific column
      const columnIndex = headers.findIndex(h => h.toLowerCase() === column.toLowerCase());
      if (columnIndex === -1) {
        throw new Error(`Column '${column}' not found in sheet '${sheetName}'`);
      }
      filteredData = data.filter(row => {
        const value = row[headers[columnIndex]] || '';
        return value.toLowerCase().includes(searchQuery);
      });
    } else {
      // Search across all columns
      filteredData = data.filter(row => {
        return Object.values(row).some(value => 
          value.toLowerCase().includes(searchQuery)
        );
      });
    }
    
    // Apply limit
    const results = filteredData.slice(0, limit);
    
    return {
      results,
      total: filteredData.length,
      query,
      column: column || 'all'
    };
  }

  async getSheetStatistics(sheetName) {
    const { headers, data } = await this.readSheet(sheetName);
    
    if (data.length === 0) {
      return {
        sheetName,
        totalRows: 0,
        totalColumns: 0,
        columns: [],
        summary: 'No data found'
      };
    }
    
    // Analyze each column
    const columnStats = headers.map(header => {
      const values = data.map(row => row[header]).filter(val => val !== '');
      const uniqueValues = [...new Set(values)];
      
      return {
        name: header,
        totalValues: values.length,
        uniqueValues: uniqueValues.length,
        emptyCells: data.length - values.length,
        sampleValues: uniqueValues.slice(0, 3) // First 3 unique values
      };
    });
    
    return {
      sheetName,
      totalRows: data.length,
      totalColumns: headers.length,
      columns: columnStats,
      summary: `Sheet contains ${data.length} rows and ${headers.length} columns`
    };
  }

  async syncToHubSpot(sheetName, hubspotConnector, syncType = 'full') {
    console.log(`🔄 Starting ${syncType} sync for sheet: ${sheetName}`);
    
    const { headers, data } = await this.readSheet(sheetName);
    
    if (data.length === 0) {
      return { success: false, message: 'No data to sync' };
    }
    
    let synced = 0;
    let errors = 0;
    
    for (const row of data) {
      try {
        // Map sheet data to HubSpot format based on sheet type
        const hubspotData = this.mapToHubSpotFormat(sheetName, row);
        
        if (hubspotData) {
          await hubspotConnector.createOrUpdateRecord(hubspotData);
          synced++;
        }
      } catch (error) {
        console.error(`❌ Error syncing row: ${error.message}`);
        errors++;
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return {
      success: true,
      synced,
      errors,
      total: data.length,
      syncType
    };
  }

  mapToHubSpotFormat(sheetName, row) {
    switch (sheetName.toLowerCase()) {
      case 'top_10_firms':
        return {
          objectType: 'companies',
          properties: {
            name: row.Name || row['Firm Name'] || '',
            phone: row.Phone || '',
            email: row.Email || '',
            city: row.City || '',
            state: row.State || '',
            location: row.Location || '',
            success_rate: parseInt(row['Success Rate']) || 0,
            years_experience: parseInt(row['Years Experience']) || parseInt(row.Experience) || 0,
            specialties: row.Specialties || '',
            notable_settlements: row['Notable Settlements'] || ''
          }
        };
        
      case 'top_10_cases':
        return {
          objectType: 'notes',
          properties: {
            hs_note_body: `Case Name: ${row['Case Name'] || row.Name || row['Case Type']}\nDescription: ${row.Description || row['Case Summary']}\nSettlement: ${row['Settlement Amount'] || row.Settlements}\nDate Filed: ${row['Date Filed']}\nStatus: ${row.Status}`,
            hs_timestamp: new Date().toISOString()
          }
        };
        
      case 'case_amounts':
        return {
          objectType: 'notes',
          properties: {
            hs_note_body: `Case Type: ${row['Case Type']}\nCondition: ${row.Condition}\nSettlement Range: ${row['Settlement Range']}\nAverage Settlement: ${row['Average Settlement']}\nTotal Cases: ${row['Total Cases']}\nYear: ${row.Year}`,
            hs_timestamp: new Date().toISOString()
          }
        };
        
      case 'legal injury advocates active cases':
        return {
          objectType: 'notes',
          properties: {
            hs_note_body: `Case Type: ${row['Case Type']}\nDescription: ${row.Description}\nKeywords: ${row.Keywords}\nActive: ${row.Active}\nLast Updated: ${row['Last Updated']}`,
            hs_timestamp: new Date().toISOString()
          }
        };
        
      default:
        console.warn(`⚠️  Unknown sheet type: ${sheetName}`);
        return null;
    }
  }

  async compareWithHubSpot(sheetName, hubspotConnector, hubspotObject) {
    console.log(`🔍 Comparing ${sheetName} with HubSpot ${hubspotObject}...`);
    
    const { data: sheetData } = await this.readSheet(sheetName);
    const hubspotData = await hubspotConnector.getRecords(hubspotObject);
    
    const comparison = {
      sheetName,
      hubspotObject,
      sheetCount: sheetData.length,
      hubspotCount: hubspotData.length,
      matches: [],
      missingInHubSpot: [],
      missingInSheet: []
    };
    
    // Simple comparison based on names/identifiers
    const sheetIdentifiers = sheetData.map(row => row.Name || row.Company || row.Condition).filter(Boolean);
    const hubspotIdentifiers = hubspotData.map(record => record.properties?.name || record.properties?.company || '').filter(Boolean);
    
    // Find matches
    comparison.matches = sheetIdentifiers.filter(id => 
      hubspotIdentifiers.some(hubId => 
        hubId.toLowerCase().includes(id.toLowerCase()) || 
        id.toLowerCase().includes(hubId.toLowerCase())
      )
    );
    
    // Find missing in HubSpot
    comparison.missingInHubSpot = sheetIdentifiers.filter(id => 
      !comparison.matches.includes(id)
    );
    
    // Find missing in Sheet
    comparison.missingInSheet = hubspotIdentifiers.filter(id => 
      !comparison.matches.some(match => 
        match.toLowerCase().includes(id.toLowerCase()) || 
        id.toLowerCase().includes(match.toLowerCase())
      )
    );
    
    return comparison;
  }

  // Utility methods
  async listAvailableSheets() {
    const endpoint = `/${this.spreadsheetId}?fields=sheets.properties.title`;
    const result = await this.makeRequest(endpoint);
    
    return result.sheets?.map(sheet => sheet.properties.title) || [];
  }

  async validateSheetStructure(sheetName, expectedColumns) {
    const { headers } = await this.readSheet(sheetName);
    
    const missingColumns = expectedColumns.filter(col => 
      !headers.some(header => header.toLowerCase() === col.toLowerCase())
    );
    
    return {
      isValid: missingColumns.length === 0,
      missingColumns,
      foundColumns: headers
    };
  }
} 