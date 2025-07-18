#!/usr/bin/env node

/**
 * Test script to verify LIA sources are included in chat API responses
 */

import fetch from 'node-fetch';

async function testLIASourcesInChat() {
    console.log('🧪 Testing LIA Sources in Chat API Responses...\n');
    
    const serverUrl = 'http://localhost:3000';
    const testQueries = [
        'What is mesothelioma?',
        'PFAS exposure symptoms',
        'Roundup lawsuit information',
        'Legal help for injury claims'
    ];
    
    for (const query of testQueries) {
        console.log(`🔍 Testing query: "${query}"`);
        
        try {
            const response = await fetch(`${serverUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: query,
                    options: {
                        temperature: 0.7
                    }
                })
            });
            
            if (!response.ok) {
                console.error(`❌ HTTP error! status: ${response.status}`);
                continue;
            }
            
            const data = await response.json();
            
            // Check if reputable sources are included
            const reputableSources = data.reputableSources || [];
            console.log(`✅ Found ${reputableSources.length} reputable sources:`);
            
            let liaSourceFound = false;
            reputableSources.forEach((source, index) => {
                const isLIA = source.type === 'LIA' || 
                             source.title.toLowerCase().includes('legal injury advocates') ||
                             source.url.includes('legalinjuryadvocates.com');
                
                if (isLIA) liaSourceFound = true;
                
                console.log(`   ${index + 1}. ${source.title} (${source.type}) ${isLIA ? '👑 LIA' : ''}`);
                console.log(`      URL: ${source.url}`);
                console.log(`      Priority: ${source.priority}`);
            });
            
            if (liaSourceFound) {
                console.log('✅ LIA source successfully included in API response!\n');
            } else {
                console.log('❌ No LIA source found in API response!\n');
            }
            
            // Check if response contains "Other Helpful Sources"
            const responseText = data.response || '';
            const hasSourcesSection = responseText.includes('Other Helpful Sources');
            console.log(`Sources section in response: ${hasSourcesSection ? '✅ Yes' : '❌ No'}`);
            
            if (hasSourcesSection) {
                const liaInResponse = responseText.toLowerCase().includes('legal injury advocates');
                console.log(`LIA mentioned in response: ${liaInResponse ? '✅ Yes' : '❌ No'}`);
            }
            
            console.log('---\n');
            
        } catch (error) {
            console.error(`❌ Error testing query "${query}":`, error.message);
        }
    }
    
    console.log('🎉 LIA Sources in Chat API Test Complete!');
}

// Run the test
testLIASourcesInChat().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
}); 