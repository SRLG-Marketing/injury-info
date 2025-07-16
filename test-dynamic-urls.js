/**
 * Test script for dynamic URL detection
 */

import fetch from 'node-fetch';

// Test different environments
const testUrls = [
    'http://localhost:3000',
    'https://injury-info.vercel.app',
    'https://staging.injury-info.vercel.app',
    'https://injuryinfo.com'
];

async function testDynamicUrls() {
    console.log('🧪 Testing Dynamic URL Detection\n');

    for (const baseUrl of testUrls) {
        console.log(`Testing: ${baseUrl}`);
        
        try {
            // Test config status endpoint
            const response = await fetch(`${baseUrl}/api/config/status`);
            
            if (response.ok) {
                const data = await response.json();
                console.log(`✅ Success - Detected URLs:`);
                console.log(`   Base URL: ${data.urls?.baseUrl || 'Not provided'}`);
                console.log(`   API Base URL: ${data.urls?.apiBaseUrl || 'Not provided'}`);
                console.log(`   Environment: ${data.urls?.environment || 'Unknown'}`);
            } else {
                console.log(`❌ Failed - Status: ${response.status}`);
            }
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
        
        console.log(''); // Empty line for readability
    }

    // Test with environment variables
    console.log('Testing with environment variables:');
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`PRODUCTION_URL: ${process.env.PRODUCTION_URL || 'not set'}`);
    console.log(`STAGING_URL: ${process.env.STAGING_URL || 'not set'}`);
    console.log(`DEVELOPMENT_URL: ${process.env.DEVELOPMENT_URL || 'not set'}`);

    console.log('\n✅ Dynamic URL tests complete!');
}

// Run the test
testDynamicUrls().catch(console.error); 