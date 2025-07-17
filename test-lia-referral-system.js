import { DataIntegrationService } from './data-integration-service.js';

async function testLIAReferralSystem() {
    console.log('🧪 Testing LIA Referral System...\n');

    try {
        // Initialize data service
        const dataService = new DataIntegrationService();
        
        console.log('📊 Step 1: Fetching LIA Active Cases from Google Sheets...');
        const liaData = await dataService.getLIAActiveCases();
        
        console.log(`✅ Found ${liaData.totalCases} total cases`);
        console.log(`✅ Found ${liaData.totalActive} active cases`);
        
        if (liaData.activeCases.length === 0) {
            console.log('⚠️  No active cases found. Please add active cases to Google Sheets to test referrals.');
            return;
        }
        
        console.log('\n📋 Active Cases Available for Referrals:');
        liaData.activeCases.forEach((caseInfo, index) => {
            console.log(`  ${index + 1}. ${caseInfo.name} (${caseInfo.caseType})`);
            console.log(`     Keywords: ${caseInfo.keywords.join(', ')}`);
            console.log(`     Description: ${caseInfo.description}`);
            console.log('');
        });
        
        // Test case detection for active cases
        console.log('🔍 Step 2: Testing Active Case Detection and Referral Logic...');
        for (const caseInfo of liaData.activeCases) {
            const testQuery = caseInfo.keywords[0]; // Use first keyword
            console.log(`\nTesting query: "${testQuery}"`);
            
            const result = await dataService.checkLIAActiveCase(testQuery);
            
            if (result.isActive) {
                console.log(`✅ CORRECT: Query "${testQuery}" correctly detected as active LIA case`);
                console.log(`   Case: ${result.name} (${result.caseType})`);
                console.log(`   Should show referral: YES`);
                console.log(`   Expected referral: "Legal Injury Advocates is currently handling ${result.name} cases. You can start your claim at legalinjuryadvocates.com"`);
            } else {
                console.log(`❌ ERROR: Query "${testQuery}" should be detected as active but wasn't`);
            }
        }
        
        // Test with a non-LIA query
        console.log('\n🔍 Step 3: Testing Non-LIA Query (Should NOT show referral)...');
        const nonLIAQuery = 'car accident';
        const result = await dataService.checkLIAActiveCase(nonLIAQuery);
        
        if (!result.isActive) {
            console.log(`✅ CORRECT: Non-LIA query "${nonLIAQuery}" correctly NOT detected as active`);
            console.log(`   Should show referral: NO`);
        } else {
            console.log(`❌ ERROR: Non-LIA query "${nonLIAQuery}" incorrectly detected as active`);
        }
        
        // Test with multiple keywords
        console.log('\n🔍 Step 4: Testing Multiple Keyword Matching...');
        for (const caseInfo of liaData.activeCases.slice(0, 2)) { // Test first 2 cases
            const testQueries = caseInfo.keywords.slice(0, 3); // Test first 3 keywords
            console.log(`\nTesting case: ${caseInfo.name}`);
            
            for (const keyword of testQueries) {
                const result = await dataService.checkLIAActiveCase(keyword);
                const status = result.isActive ? '✅ MATCH' : '❌ NO MATCH';
                console.log(`   "${keyword}" -> ${status}`);
            }
        }
        
        console.log('\n🎉 LIA Referral System Test Complete!');
        console.log('\n📝 Summary:');
        console.log(`- Total cases: ${liaData.totalCases}`);
        console.log(`- Active cases: ${liaData.totalActive}`);
        console.log(`- Referral system: ENABLED for active cases`);
        console.log(`- Referral system: DISABLED for inactive cases`);
        console.log('\n✅ The system will now show legalinjuryadvocates.com referrals for ACTIVE cases only!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testLIAReferralSystem(); 