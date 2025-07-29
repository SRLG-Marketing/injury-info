/**
 * Test Script for Reputable Sources System
 * 
 * This script helps you test the reputable sources integration
 * and verify that everything is working correctly.
 */

import { DataIntegrationService } from './data-integration-service.js';
import { ReputableSourcesService } from './reputable-sources-service.js';
import { GoogleSheetsConnector } from './google-sheets-connector.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testReputableSources() {
    console.log('🧪 Testing Reputable Sources System\n');

    // Test 1: Check Google Sheets Connection
    console.log('📊 Test 1: Google Sheets Connection');
    try {
        const googleSheets = new GoogleSheetsConnector({
            apiKey: process.env.GOOGLE_API_KEY,
            spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID
        });
        console.log('✅ Google Sheets connector created successfully');
        
        // Try to read the Reputable_Sources sheet
        const { data, headers } = await googleSheets.readSheet('Reputable_Sources');
        console.log(`✅ Successfully read ${data.length} rows from Reputable_Sources sheet`);
        console.log(`📋 Headers: ${headers.join(', ')}`);
        
        if (data.length === 0) {
            console.log('⚠️  No data found in Reputable_Sources sheet');
            console.log('   Please add some sample data to test the system');
        } else {
            console.log('📝 Sample data found:');
            console.log(data.slice(0, 2));
        }
    } catch (error) {
        console.log('❌ Google Sheets connection failed:', error.message);
        console.log('   Make sure your GOOGLE_API_KEY and GOOGLE_SPREADSHEET_ID are set correctly');
        return;
    }

    // Test 2: Reputable Sources Service
    console.log('\n📚 Test 2: Reputable Sources Service');
    try {
        const googleSheets = new GoogleSheetsConnector({
            apiKey: process.env.GOOGLE_API_KEY,
            spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID
        });
        
        const reputableSources = new ReputableSourcesService({
            googleSheets: googleSheets
        });
        
        const allSources = await reputableSources.getAllReputableSources();
        console.log(`✅ Successfully fetched ${allSources.length} reputable sources`);
        
        if (allSources.length > 0) {
            console.log('📋 Sample source:');
            console.log({
                diseaseAilment: allSources[0].diseaseAilment,
                sourceTitle: allSources[0].sourceTitle,
                sourceType: allSources[0].sourceType,
                priority: allSources[0].priority
            });
        }
    } catch (error) {
        console.log('❌ Reputable sources service failed:', error.message);
    }

    // Test 3: Query Matching
    console.log('\n🔍 Test 3: Query Matching');
    try {
        const googleSheets = new GoogleSheetsConnector({
            apiKey: process.env.GOOGLE_API_KEY,
            spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID
        });
        
        const reputableSources = new ReputableSourcesService({
            googleSheets: googleSheets
        });
        
        const testQueries = [
            'mesothelioma',
            'pfas in water',
            'roundup cancer',
            'talcum powder ovarian cancer',
            'hair relaxer cancer'
        ];
        
        for (const query of testQueries) {
            console.log(`\n🔍 Testing query: "${query}"`);
            const sources = await reputableSources.findRelevantSources(query, 2);
            console.log(`   Found ${sources.length} relevant sources`);
            
            if (sources.length > 0) {
                sources.forEach((source, index) => {
                    console.log(`   ${index + 1}. ${source.sourceTitle} (Priority: ${source.priority}, Score: ${source.score})`);
                });
            } else {
                console.log('   No sources found - consider adding more keywords or sources');
            }
        }
    } catch (error) {
        console.log('❌ Query matching test failed:', error.message);
    }

    // Test 4: Data Integration Service
    console.log('\n🔗 Test 4: Data Integration Service');
    try {
        const dataService = new DataIntegrationService();
        
        const testQueries = [
            'mesothelioma symptoms',
            'pfas exposure health effects'
        ];
        
        for (const query of testQueries) {
            console.log(`\n🔍 Testing integration with query: "${query}"`);
            const sources = await dataService.getReputableSources(query, 2);
            console.log(`   Found ${sources.length} sources through data service`);
            
            if (sources.length > 0) {
                const formatted = dataService.formatReputableSourcesForResponse(sources);
                console.log('   Formatted response:');
                console.log(formatted.substring(0, 200) + '...');
            }
        }
    } catch (error) {
        console.log('❌ Data integration service test failed:', error.message);
    }

    // Test 5: API Endpoint Simulation
    console.log('\n🌐 Test 5: API Endpoint Simulation');
    try {
        const dataService = new DataIntegrationService();
        
        // Simulate the /api/reputable-sources endpoint
        const testParams = [
            { query: 'mesothelioma', limit: 3 },
            { disease: 'PFAS Exposure', limit: 2 }
        ];
        
        for (const params of testParams) {
            console.log(`\n🔍 Testing API params:`, params);
            
            let sources = [];
            if (params.query) {
                sources = await dataService.getReputableSources(params.query, params.limit);
            } else if (params.disease) {
                sources = await dataService.getReputableSourcesForDisease(params.disease, params.limit);
            }
            
            console.log(`   API would return ${sources.length} sources`);
            
            const apiResponse = {
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
                query: params.query || params.disease
            };
            
            console.log('   API response structure:');
            console.log(JSON.stringify(apiResponse, null, 2).substring(0, 300) + '...');
        }
    } catch (error) {
        console.log('❌ API endpoint simulation failed:', error.message);
    }

    console.log('\n🎉 Testing Complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. If all tests passed, your system is ready to use');
    console.log('2. If some tests failed, check the error messages above');
    console.log('3. Add more sources to your Google Sheet for better coverage');
    console.log('4. Test with real user queries to see sources in action');
    console.log('5. Monitor the logs to see how sources are being matched');
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testReputableSources().catch(error => {
        console.error('❌ Test failed with error:', error);
        process.exit(1);
    });
}

export { testReputableSources };

/**
 * Test script for relevant source selection
 */

async function testRelevantSourceSelection() {
    console.log('🧪 Testing Relevant Source Selection in Reputable Sources...\n');
    
    // Test without Google Sheets (using fallback)
    const reputableSources = new ReputableSourcesService();
    
    const testQueries = [
        'What is mesothelioma?',
        'PFAS exposure symptoms',
        'Roundup lawsuit information',
        'Legal help for injury claims',
        'How to file a personal injury claim'
    ];
    
    for (const query of testQueries) {
        console.log(`🔍 Testing query: "${query}"`);
        
        try {
            const sources = await reputableSources.findRelevantSources(query, 5);
            
            console.log(`✅ Found ${sources.length} relevant sources:`);
            
            sources.forEach((source, index) => {
                console.log(`   ${index + 1}. ${source.sourceTitle} (${source.sourceType})`);
                console.log(`      URL: ${source.sourceUrl}`);
                console.log(`      Score: ${source.score || 'N/A'}`);
            });
            
            console.log('✅ Relevant sources selected successfully!\n');
            
        } catch (error) {
            console.error(`❌ Error testing query "${query}":`, error.message);
        }
    }
    
    // Test with empty query
    console.log('🔍 Testing empty query...');
    const emptyResults = await reputableSources.findRelevantSources('', 5);
    console.log(`✅ Empty query returned ${emptyResults.length} sources\n`);
    
    console.log('\n🎉 Relevant Source Selection Test Complete!');
}

// Run the test
testRelevantSourceSelection().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
}); 