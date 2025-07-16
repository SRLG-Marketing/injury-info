/**
 * Test script to verify mesothelioma queries don't trigger inappropriate LIA referrals
 */

import fetch from 'node-fetch';

// Get API base URL from environment or default to localhost
const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api';

async function testMesotheliomaFix() {
    console.log('🧪 Testing Mesothelioma LIA Referral Fix\n');

    // Test 1: Mesothelioma settlement query (should NOT trigger LIA case)
    console.log('1. Testing mesothelioma settlement query (should NOT trigger LIA case)...');
    try {
        const response1 = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: 'What is the settlement range for mesothelioma cases in 2024?'
            })
        });
        const result1 = await response1.json();
        console.log('Response:', result1.response.substring(0, 300) + '...');
        console.log('LIA Case Detected:', result1.liaCase ? 'YES' : 'NO');
        if (result1.liaCase) {
            console.log('❌ ERROR: Case Info:', result1.liaCase);
        } else {
            console.log('✅ CORRECT: No LIA case detected for mesothelioma');
        }
    } catch (error) {
        console.log('Error:', error.message);
    }

    // Test 2: Direct LIA case check for mesothelioma
    console.log('\n2. Testing direct LIA case check for mesothelioma...');
    try {
        const response2 = await fetch(`${API_BASE}/lia/check-case`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                query: 'mesothelioma settlement range 2024'
            })
        });
        const result2 = await response2.json();
        console.log('LIA Check Result:', result2);
        if (!result2.isActive) {
            console.log('✅ CORRECT: Mesothelioma correctly NOT detected as active LIA case');
        } else {
            console.log('❌ ERROR: Mesothelioma incorrectly detected as active LIA case');
        }
    } catch (error) {
        console.log('Error:', error.message);
    }

    // Test 3: Test talcum powder (should trigger LIA case)
    console.log('\n3. Testing talcum powder query (should trigger LIA case)...');
    try {
        const response3 = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: 'I used baby powder for years, can I file a claim?'
            })
        });
        const result3 = await response3.json();
        console.log('Response:', result3.response.substring(0, 300) + '...');
        console.log('LIA Case Detected:', result3.liaCase ? 'YES' : 'NO');
        if (result3.liaCase) {
            console.log('✅ CORRECT: Talcum powder correctly detected as active LIA case');
            console.log('Case Info:', result3.liaCase.name, '-', result3.liaCase.description);
        } else {
            console.log('❌ ERROR: Talcum powder should be detected as active LIA case');
        }
    } catch (error) {
        console.log('Error:', error.message);
    }

    // Test 4: Test PFAS/forever chemicals (should NOT trigger if inactive)
    console.log('\n4. Testing PFAS/forever chemicals query...');
    try {
        const response4 = await fetch(`${API_BASE}/lia/check-case`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                query: 'forever chemicals in water contamination'
            })
        });
        const result4 = await response4.json();
        console.log('LIA Check Result:', result4);
        if (!result4.isActive) {
            console.log('✅ CORRECT: PFAS/forever chemicals correctly NOT detected as active LIA case');
        } else {
            console.log('❌ ERROR: PFAS/forever chemicals incorrectly detected as active LIA case');
        }
    } catch (error) {
        console.log('Error:', error.message);
    }

    console.log('\n🎉 Mesothelioma LIA Referral Fix Test Complete!');
    console.log('\n📝 Summary:');
    console.log('- Mesothelioma queries should NOT trigger LIA referrals');
    console.log('- Only active cases in Google Sheets should trigger referrals');
    console.log('- PFAS/forever chemicals are inactive by default');
    console.log('- Talcum powder should still work if active');
}

testMesotheliomaFix().catch(console.error); 