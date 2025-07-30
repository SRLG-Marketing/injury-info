/**
 * Script to check what sources are currently in Google Sheets
 */

import { GoogleSheetsConnector } from './google-sheets-connector.js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env.local') });

async function checkGoogleSheetsSources() {
    console.log('🔍 Checking Google Sheets Sources...\n');

    try {
        // Initialize Google Sheets connector
        const googleSheets = new GoogleSheetsConnector({
            apiKey: process.env.GOOGLE_API_KEY,
            spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID
        });

        // Read the Reputable_Sources tab
        const { data, headers } = await googleSheets.readSheet('Reputable_Sources');
        
        console.log(`✅ Successfully read ${data.length} rows from Reputable_Sources`);
        console.log(`📋 Headers: ${headers.join(', ')}\n`);
        
        // Show unique Source_Type values
        const sourceTypes = [...new Set(data.map(row => row.Source_Type))].filter(Boolean);
        console.log(`📊 Source Types found: ${sourceTypes.join(', ')}\n`);
        
        // Show unique Disease_Ailment values
        const diseaseAilments = [...new Set(data.map(row => row.Disease_Ailment))].filter(Boolean);
        console.log(`🏥 Disease/Ailment types found: ${diseaseAilments.join(', ')}\n`);
        
        // Check for LIA sources by Source_Type
        const liaRelated = data.filter(row => 
            row.Source_Type === 'LIA Blog Post' ||
            row.Source_Type === 'Legal Injury Advocates'
        );
        
        console.log(`🎯 Sources with Source_Type "LIA Blog Post" or "Legal Injury Advocates": ${liaRelated.length}`);
        
        if (liaRelated.length > 0) {
            console.log('\n📋 LIA-related sources found:');
            liaRelated.forEach((source, index) => {
                console.log(`  ${index + 1}. ${source.Source_Title}`);
                console.log(`     Source_Type: ${source.Source_Type}`);
                console.log(`     Active: ${source.Active}`);
                console.log(`     URL: ${source.Source_URL}`);
                console.log('');
            });
        }
        
        // Show first 10 sources as examples
        console.log('📋 First 10 sources in Google Sheets:');
        data.slice(0, 10).forEach((source, index) => {
            console.log(`  ${index + 1}. ${source.Source_Title}`);
            console.log(`     Disease: ${source.Disease_Ailment}`);
            console.log(`     Type: ${source.Source_Type}`);
            console.log(`     Active: ${source.Active}`);
            console.log(`     Priority: ${source.Priority}`);
            console.log('');
        });
        
        // Check for any sources with "LIA" in Source_Type (case insensitive)
        const liaSources = data.filter(row => 
            row.Source_Type && 
            row.Source_Type.toLowerCase() === 'lia'
        );
        
        console.log(`🔍 Sources with Source_Type = "LIA": ${liaSources.length}`);
        
        if (liaSources.length > 0) {
            console.log('\n📋 LIA sources found:');
            liaSources.forEach((source, index) => {
                console.log(`  ${index + 1}. ${source.Source_Title}`);
                console.log(`     Active: ${source.Active}`);
                console.log(`     URL: ${source.Source_URL}`);
                console.log('');
            });
        }
        
    } catch (error) {
        console.error('❌ Error checking Google Sheets sources:', error.message);
    }
}

// Run the check
checkGoogleSheetsSources().catch(console.error); 