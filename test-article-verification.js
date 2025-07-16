/**
 * Test script for article verification functionality
 */

import fetch from 'node-fetch';

// Get API base URL from environment or default to localhost
const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api';

async function testArticleVerification() {
    console.log('🧪 Testing Article Verification System\n');

    // Test 1: Verify a real article (if any exist)
    console.log('1. Testing with a real article reference...');
    try {
        const response1 = await fetch(`${API_BASE}/verify-article`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ articleTitle: 'mesothelioma symptoms' })
        });
        const result1 = await response1.json();
        console.log('Result:', result1);
    } catch (error) {
        console.log('Error:', error.message);
    }

    // Test 2: Verify a fake article
    console.log('\n2. Testing with a fake article reference...');
    try {
        const response2 = await fetch(`${API_BASE}/verify-article`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ articleTitle: 'Fake Article About Nothing' })
        });
        const result2 = await response2.json();
        console.log('Result:', result2);
    } catch (error) {
        console.log('Error:', error.message);
    }

    // Test 3: Test chat with article reference
    console.log('\n3. Testing chat with article reference...');
    try {
        const response3 = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: 'Tell me about mesothelioma and suggest an article to read',
                systemMessage: 'You are a helpful assistant. Only reference articles that actually exist in your database.'
            })
        });
        const result3 = await response3.json();
        console.log('Response:', result3.response.substring(0, 200) + '...');
        console.log('Verified:', result3.verified);
        console.log('Warnings:', result3.warnings);
    } catch (error) {
        console.log('Error:', error.message);
    }

    console.log('\n✅ Article verification tests complete!');
}

// Run the test
testArticleVerification().catch(console.error); 