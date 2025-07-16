/**
 * Setup script for Query_Tracking Google Sheet
 * This creates the sheet with proper headers for tracking user queries and keywords
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });

import { GoogleSheetsConnector } from '../google-sheets-connector.js';

async function setupQueryTracking() {
    console.log('📊 Setting up Query_Tracking sheet...\n');
    
    const googleSheets = new GoogleSheetsConnector();
    
    try {
        // Check if sheet exists
        const existingSheets = await googleSheets.listSheets();
        const hasTrackingSheet = existingSheets.some(sheet => 
            sheet.toLowerCase().includes('query_tracking') || 
            sheet.toLowerCase().includes('query tracking')
        );
        
        if (hasTrackingSheet) {
            console.log('✅ Query_Tracking sheet already exists');
            return;
        }
        
        // Create the sheet with headers
        const headers = [
            'Timestamp',
            'Query',
            'Keywords',
            'LIA_Case_Detected',
            'LIA_Case_Type',
            'LIA_Case_Name',
            'User_Agent',
            'IP_Address',
            'Session_ID',
            'Page_URL',
            'Referrer'
        ];
        
        console.log('📝 Creating Query_Tracking sheet with headers...');
        await googleSheets.createSheet('Query_Tracking', headers);
        
        console.log('✅ Query_Tracking sheet created successfully!');
        console.log('\n📋 Headers added:');
        headers.forEach((header, index) => {
            console.log(`   ${index + 1}. ${header}`);
        });
        
        console.log('\n🎯 This sheet will automatically track:');
        console.log('   • All user queries with timestamps');
        console.log('   • Extracted keywords (filtered for relevance)');
        console.log('   • LIA case detection results');
        console.log('   • User context (browser, IP, session, etc.)');
        console.log('   • Page URLs and referrers');
        
        console.log('\n📊 You can now view analytics at:');
        console.log('   GET /api/analytics/queries?days=30');
        
    } catch (error) {
        console.error('❌ Error setting up Query_Tracking sheet:', error);
        throw error;
    }
}

// Run the setup
if (import.meta.url === `file://${process.argv[1]}`) {
    setupQueryTracking()
        .then(() => {
            console.log('\n🎉 Query tracking setup complete!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Setup failed:', error);
            process.exit(1);
        });
}

export { setupQueryTracking }; 