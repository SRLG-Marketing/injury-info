/**
 * Test script to verify LIA Active field functionality
 * This script tests that cases marked as inactive (false) don't trigger LIA suggestions
 */

import { DataIntegrationService } from './data-integration-service.js';
import { GoogleSheetsConnector } from './google-sheets-connector.js';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

async function testLIAActiveField() {
    console.log('🧪 Testing LIA Active Field Functionality...\n');

    try {
        // Initialize data service
        const dataService = new DataIntegrationService();
        
        console.log('📊 Step 1: Fetching LIA Active Cases from Google Sheets...');
        const liaData = await dataService.getLIAActiveCases();
        
        console.log(`✅ Found ${liaData.totalCases} total cases`);
        console.log(`✅ Found ${liaData.totalActive} active cases`);
        
        console.log('\n📋 Active Cases:');
        liaData.activeCases.forEach((caseInfo, index) => {
            console.log(`  ${index + 1}. ${caseInfo.name} (${caseInfo.caseType})`);
            console.log(`     Keywords: ${caseInfo.keywords.join(', ')}`);
            console.log(`     Active: ${caseInfo.active}`);
            console.log('');
        });
        
        console.log('\n📋 All Cases (including inactive):');
        liaData.allCases.forEach((caseInfo, index) => {
            console.log(`  ${index + 1}. ${caseInfo.name} (${caseInfo.caseType})`);
            console.log(`     Keywords: ${caseInfo.keywords.join(', ')}`);
            console.log(`     Active: ${caseInfo.active}`);
            console.log('');
        });
        
        // Test case detection for active cases
        console.log('🔍 Step 2: Testing Active Case Detection...');
        for (const caseInfo of liaData.activeCases) {
            const testQuery = caseInfo.keywords[0]; // Use first keyword
            console.log(`\nTesting query: "${testQuery}"`);
            
            const result = await dataService.checkLIAActiveCase(testQuery);
            
            if (result.isActive) {
                console.log(`✅ CORRECT: Query "${testQuery}" correctly detected as active LIA case`);
                console.log(`   Case: ${result.name} (${result.caseType})`);
            } else {
                console.log(`❌ ERROR: Query "${testQuery}" should be detected as active but wasn't`);
            }
        }
        
        // Test case detection for inactive cases
        console.log('\n🔍 Step 3: Testing Inactive Case Detection...');
        const inactiveCases = liaData.allCases.filter(caseInfo => !caseInfo.active);
        
        if (inactiveCases.length > 0) {
            for (const caseInfo of inactiveCases) {
                const testQuery = caseInfo.keywords[0]; // Use first keyword
                console.log(`\nTesting query: "${testQuery}" (should be inactive)`);
                
                const result = await dataService.checkLIAActiveCase(testQuery);
                
                if (!result.isActive) {
                    console.log(`✅ CORRECT: Query "${testQuery}" correctly NOT detected as active LIA case`);
                } else {
                    console.log(`❌ ERROR: Query "${testQuery}" should NOT be detected as active but was`);
                    console.log(`   Case: ${result.name} (${result.caseType})`);
                }
            }
        } else {
            console.log('ℹ️  No inactive cases found to test');
        }
        
        // Test with a non-LIA query
        console.log('\n🔍 Step 4: Testing Non-LIA Query...');
        const nonLIAQuery = 'car accident';
        const result = await dataService.checkLIAActiveCase(nonLIAQuery);
        
        if (!result.isActive) {
            console.log(`✅ CORRECT: Non-LIA query "${nonLIAQuery}" correctly NOT detected as active`);
        } else {
            console.log(`❌ ERROR: Non-LIA query "${nonLIAQuery}" incorrectly detected as active`);
        }
        
        console.log('\n🎉 LIA Active Field Test Complete!');
        console.log('\n📝 Summary:');
        console.log(`- Total cases: ${liaData.totalCases}`);
        console.log(`- Active cases: ${liaData.totalActive}`);
        console.log(`- Inactive cases: ${liaData.totalCases - liaData.totalActive}`);
        console.log('\n✅ The system will only suggest legalinjuryadvocates.com for ACTIVE cases!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testLIAActiveField(); 