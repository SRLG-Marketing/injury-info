/**
 * Test script to verify HubSpot query logging
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env.local') });

import { DataIntegrationService } from './data-integration-service.js';

async function testHubSpotLogging() {
    console.log('🧪 Testing HubSpot Query Logging\n');
    
    const dataService = new DataIntegrationService();
    
    try {
        // Test 1: Single query logging
        console.log('1. Testing single query logging...');
        await dataService.logQuery('mesothelioma settlement amounts', 'test');
        console.log('✅ Single query logged successfully\n');
        
        // Test 2: Batch query logging
        console.log('2. Testing batch query logging...');
        const testQueries = [
            'lymphoma cancer treatment',
            'talcum powder lawsuit',
            'forever chemicals water contamination',
            'roundup cancer claims'
        ];
        
        await dataService.batchLogQueries(testQueries, 'test-batch');
        console.log('✅ Batch queries logged successfully\n');
        
        console.log('🎉 All HubSpot logging tests passed!');
        console.log('\n📋 Check your HubSpot CRM for:');
        console.log('   - Contact: analytics@yourdomain.com');
        console.log('   - Notes with keyword queries');
        console.log('   - Timestamps and source information');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\n💡 Make sure your HubSpot API key is configured in .env.local');
    }
}

testHubSpotLogging(); 