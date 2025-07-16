/**
 * Test script to verify condition accuracy and prevent inappropriate LIA referrals
 */

import fetch from 'node-fetch';

// Get API base URL from environment or default to localhost
const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api';

async function testConditionAccuracy() {
    console.log('🧪 Testing Condition Accuracy and LIA Referral Prevention\n');

    const testCases = [
        {
            name: 'Lymphoma (should NOT trigger LIA)',
            query: 'lymphoma',
            shouldTriggerLIA: false,
            expectedCondition: 'lymphoma'
        },
        {
            name: 'Mesothelioma (should NOT trigger LIA in current setup)',
            query: 'mesothelioma',
            shouldTriggerLIA: false,
            expectedCondition: 'mesothelioma'
        },
        {
            name: 'Talcum Powder (should trigger LIA)',
            query: 'talcum powder',
            shouldTriggerLIA: true,
            expectedCondition: 'talcum powder'
        },
        {
            name: 'Forever Chemicals (should NOT trigger LIA)',
            query: 'forever chemicals',
            shouldTriggerLIA: false,
            expectedCondition: 'forever chemicals'
        }
    ];

    for (const testCase of testCases) {
        console.log(`\n${testCase.name}:`);
        console.log(`Query: "${testCase.query}"`);
        
        try {
            // Test chat response
            const chatResponse = await fetch(`${API_BASE}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: testCase.query
                })
            });
            const chatResult = await chatResponse.json();
            
            console.log(`Response: ${chatResult.response.substring(0, 150)}...`);
            console.log(`LIA Case Detected: ${chatResult.liaCase ? 'YES' : 'NO'}`);
            
            // Check if LIA referral is appropriate
            if (testCase.shouldTriggerLIA && !chatResult.liaCase) {
                console.log('❌ ERROR: Should trigger LIA but didn\'t');
            } else if (!testCase.shouldTriggerLIA && chatResult.liaCase) {
                console.log('❌ ERROR: Should NOT trigger LIA but did');
                console.log('Case Info:', chatResult.liaCase);
            } else {
                console.log('✅ CORRECT: LIA referral behavior is appropriate');
            }
            
            // Check for condition confusion
            const responseLower = chatResult.response.toLowerCase();
            const queryLower = testCase.query.toLowerCase();
            
            if (responseLower.includes(queryLower)) {
                console.log('✅ CORRECT: Response discusses the correct condition');
            } else {
                console.log('❌ ERROR: Response may be discussing wrong condition');
            }
            
            // Check for inappropriate legal referrals
            if (!testCase.shouldTriggerLIA && responseLower.includes('legal injury advocates')) {
                console.log('❌ ERROR: Inappropriate LIA referral found in response');
            } else if (!testCase.shouldTriggerLIA && !responseLower.includes('legal injury advocates')) {
                console.log('✅ CORRECT: No inappropriate LIA referral');
            }
            
        } catch (error) {
            console.log('Error:', error.message);
        }
    }

    console.log('\n🎉 Condition Accuracy Test Complete!');
    console.log('\n📝 Summary:');
    console.log('- Lymphoma queries should NOT trigger LIA referrals');
    console.log('- Mesothelioma queries should NOT trigger LIA referrals (unless active)');
    console.log('- Talcum powder should trigger LIA referrals if active');
    console.log('- Forever chemicals should NOT trigger LIA referrals');
    console.log('- AI should never mix up different medical conditions');
}

testConditionAccuracy().catch(console.error); 