/**
 * Test script for LIA case detection and automatic prompting
 */

import fetch from 'node-fetch';

// Get API base URL from environment or default to localhost
const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api';

async function testLIADetection() {
    console.log('🧪 Testing LIA Case Detection System\n');

    // Test 1: Query about mesothelioma (should trigger LIA case)
    console.log('1. Testing mesothelioma query (should trigger LIA case)...');
    try {
        const response1 = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: 'What are mesothelioma symptoms and can I file a claim?'
            })
        });
        const result1 = await response1.json();
        console.log('Response:', result1.response.substring(0, 300) + '...');
        console.log('LIA Case Detected:', result1.liaCase ? 'YES' : 'NO');
        if (result1.liaCase) {
            console.log('Case Info:', result1.liaCase);
        }
    } catch (error) {
        console.log('Error:', error.message);
    }

    // Test 2: Query about talcum powder (should trigger LIA case)
    console.log('\n2. Testing talcum powder query (should trigger LIA case)...');
    try {
        const response2 = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: 'I used baby powder for years, can I sue?'
            })
        });
        const result2 = await response2.json();
        console.log('Response:', result2.response.substring(0, 300) + '...');
        console.log('LIA Case Detected:', result2.liaCase ? 'YES' : 'NO');
        if (result2.liaCase) {
            console.log('Case Info:', result2.liaCase);
        }
    } catch (error) {
        console.log('Error:', error.message);
    }

    // Test 3: Query about something not in LIA cases
    console.log('\n3. Testing unrelated query (should NOT trigger LIA case)...');
    try {
        const response3 = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: 'What is the weather like today?'
            })
        });
        const result3 = await response3.json();
        console.log('Response:', result3.response.substring(0, 200) + '...');
        console.log('LIA Case Detected:', result3.liaCase ? 'YES' : 'NO');
    } catch (error) {
        console.log('Error:', error.message);
    }

    // Test 4: Direct LIA case check
    console.log('\n4. Testing direct LIA case check...');
    try {
        const response4 = await fetch(`${API_BASE}/lia/check-case`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                query: 'asbestos exposure mesothelioma'
            })
        });
        const result4 = await response4.json();
        console.log('LIA Check Result:', result4);
    } catch (error) {
        console.log('Error:', error.message);
    }

    console.log('\n✅ LIA case detection tests complete!');
}

// Run the test
testLIADetection().catch(console.error); 