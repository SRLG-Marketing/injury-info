// Test file for source verification functionality
import { addSourcesToResponse, findRelevantSources, verifySource } from './utils/source-verifier.js';

async function testSourceVerification() {
  console.log('🧪 Testing Source Verification System\n');

  // Test 1: Medical query
  console.log('📋 Test 1: Medical Query');
  console.log('Query: "What are the symptoms of mesothelioma?"');
  console.log('AI Response: "Mesothelioma is a rare cancer that affects the lining of the lungs, abdomen, or heart. Common symptoms include chest pain, shortness of breath, and fatigue."');
  
  const medicalQuery = "What are the symptoms of mesothelioma?";
  const medicalResponse = "Mesothelioma is a rare cancer that affects the lining of the lungs, abdomen, or heart. Common symptoms include chest pain, shortness of breath, and fatigue.";
  
  try {
    const responseWithSources = await addSourcesToResponse(medicalQuery, medicalResponse);
    console.log('\n✅ Response with sources:');
    console.log(responseWithSources);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Test 2: Legal query
  console.log('📋 Test 2: Legal Query');
  console.log('Query: "How do I file a mesothelioma lawsuit?"');
  console.log('AI Response: "To file a mesothelioma lawsuit, you need to prove exposure to asbestos and that it caused your illness. The process involves finding an attorney, gathering evidence, and filing in the appropriate court."');
  
  const legalQuery = "How do I file a mesothelioma lawsuit?";
  const legalResponse = "To file a mesothelioma lawsuit, you need to prove exposure to asbestos and that it caused your illness. The process involves finding an attorney, gathering evidence, and filing in the appropriate court.";
  
  try {
    const responseWithSources = await addSourcesToResponse(legalQuery, legalResponse);
    console.log('\n✅ Response with sources:');
    console.log(responseWithSources);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Test 3: Find relevant sources
  console.log('📋 Test 3: Find Relevant Sources');
  console.log('Query: "What is asbestos exposure?"');
  
  const query = "What is asbestos exposure?";
  const response = "Asbestos exposure occurs when people inhale or ingest asbestos fibers. This can happen in workplaces, homes, or other environments where asbestos-containing materials are disturbed.";
  
  try {
    const sources = await findRelevantSources(query, response);
    console.log('\n✅ Found sources:');
    console.log(JSON.stringify(sources, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Test 4: Verify individual source
  console.log('📋 Test 4: Verify Individual Source');
  
  const testSource = {
    title: "Mayo Clinic - mesothelioma",
    url: "https://www.mayoclinic.org/search/search-results?q=mesothelioma",
    domain: "mayoclinic.org",
    type: "medical",
    reliability: "high"
  };
  
  try {
    const verifiedSource = await verifySource(testSource);
    console.log('\n✅ Verified source:');
    console.log(JSON.stringify(verifiedSource, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Test 5: General health query
  console.log('📋 Test 5: General Health Query');
  console.log('Query: "What are the treatment options for cancer?"');
  
  const healthQuery = "What are the treatment options for cancer?";
  const healthResponse = "Cancer treatment options include surgery, chemotherapy, radiation therapy, immunotherapy, and targeted therapy. The specific treatment depends on the type and stage of cancer.";
  
  try {
    const responseWithSources = await addSourcesToResponse(healthQuery, healthResponse);
    console.log('\n✅ Response with sources:');
    console.log(responseWithSources);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n🎉 Source verification testing completed!');
}

// Run the tests
testSourceVerification().catch(console.error); 