/**
 * Test script to verify mesothelioma queries don't generate referral messages
 */

import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:3000/api';

async function testMesotheliomaQuery() {
  try {
    console.log('🧪 Testing mesothelioma query...');
    
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'mesothelioma'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('✅ Response received:');
    console.log('📝 Response text:', data.response.substring(0, 200) + '...');
    console.log('🔍 LIA Case Info:', data.liaCase);
    console.log('📊 Verified:', data.verified);
    
    // Check if the response contains any referral messages
    const hasReferralMessage = data.response.includes('Legal Injury Advocates') || 
                              data.response.includes('legalinjuryadvocates.com') ||
                              data.response.includes('➡️');
    
    if (hasReferralMessage) {
      console.log('❌ FAILED: Response still contains referral messages');
      console.log('🔍 Full response:', data.response);
    } else {
      console.log('✅ SUCCESS: No referral messages found in response');
    }
    
    return !hasReferralMessage;
    
  } catch (error) {
    console.error('❌ Error testing mesothelioma query:', error);
    return false;
  }
}

async function testOvarianCancerQuery() {
  try {
    console.log('\n🧪 Testing ovarian cancer query (should have referral)...');
    
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'ovarian cancer'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('✅ Response received:');
    console.log('📝 Response text:', data.response.substring(0, 200) + '...');
    console.log('🔍 LIA Case Info:', data.liaCase);
    
    // Check if the response contains referral messages (should for ovarian cancer)
    const hasReferralMessage = data.response.includes('Legal Injury Advocates') || 
                              data.response.includes('legalinjuryadvocates.com') ||
                              data.response.includes('➡️');
    
    if (hasReferralMessage) {
      console.log('✅ SUCCESS: Ovarian cancer query correctly includes referral message');
    } else {
      console.log('❌ FAILED: Ovarian cancer query should have referral message');
    }
    
    return hasReferralMessage;
    
  } catch (error) {
    console.error('❌ Error testing ovarian cancer query:', error);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting referral message tests...\n');
  
  const mesotheliomaResult = await testMesotheliomaQuery();
  const ovarianCancerResult = await testOvarianCancerQuery();
  
  console.log('\n📊 Test Results:');
  console.log(`   Mesothelioma (no referral): ${mesotheliomaResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Ovarian Cancer (with referral): ${ovarianCancerResult ? '✅ PASS' : '❌ FAIL'}`);
  
  if (mesotheliomaResult && ovarianCancerResult) {
    console.log('\n🎉 All tests passed! Referral system is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
  }
}

runTests().catch(console.error); 