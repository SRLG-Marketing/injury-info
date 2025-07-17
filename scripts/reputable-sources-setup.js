/**
 * Reputable Sources Setup Script
 * 
 * This script helps set up the Google Sheets structure for reputable sources
 * that will be used to provide verified links in AI responses.
 */

// Google Sheets structure for reputable sources
const REPUTABLE_SOURCES_STRUCTURE = {
    sheet_name: 'Reputable_Sources',
    columns: [
        'Disease_Ailment',      // Primary condition (e.g., "Mesothelioma", "PFAS Exposure")
        'Source_Title',         // Title of the source/article
        'Source_URL',           // Direct link to the source
        'Source_Type',          // Type: "Medical", "Legal", "Government", "Research", "News"
        'Priority',             // Priority: 1 (highest) to 5 (lowest)
        'Keywords',             // Comma-separated keywords that trigger this source
        'Description',          // Brief description of what the source covers
        'Last_Updated',         // When the source was last verified
        'Active'                // TRUE/FALSE - whether to include in responses
    ],
    
    // Sample data structure (for reference only - actual data comes from Google Sheets)
    sample_data: [
        {
            'Disease_Ailment': 'Example Condition',
            'Source_Title': 'Example Source - Organization',
            'Source_URL': 'https://example.com/source',
            'Source_Type': 'Medical',
            'Priority': 1,
            'Keywords': 'example, condition, keywords',
            'Description': 'Example description of what this source covers',
            'Last_Updated': '2024-01-15',
            'Active': 'TRUE'
        }
    ]
};

/**
 * Create the Google Sheets template for reputable sources
 */
function createReputableSourcesTemplate() {
    console.log('📋 Creating Reputable Sources Google Sheets Template...\n');
    
    console.log('📊 Sheet Name: Reputable_Sources');
    console.log('📋 Columns:');
    REPUTABLE_SOURCES_STRUCTURE.columns.forEach((column, index) => {
        console.log(`   ${index + 1}. ${column}`);
    });
    
    console.log('\n📝 Sample Data Structure:');
    console.log('Each row represents a reputable source that can be referenced in AI responses.');
    console.log('The system will match user queries against keywords and return relevant sources.');
    
    console.log('\n🎯 Priority System:');
    console.log('1 = Highest priority (most authoritative sources)');
    console.log('2 = High priority (well-respected sources)');
    console.log('3 = Medium priority (good sources)');
    console.log('4 = Lower priority (acceptable sources)');
    console.log('5 = Lowest priority (basic sources)');
    
    console.log('\n🔍 Keyword Matching:');
    console.log('- Keywords are comma-separated');
    console.log('- System matches user query words against keywords');
    console.log('- Multiple sources can be returned for a single query');
    console.log('- Sources are sorted by priority (lowest number first)');
    
    console.log('\n📋 Source Types:');
    console.log('- Medical: Mayo Clinic, NIH, medical journals');
    console.log('- Government: EPA, FDA, CDC, court records');
    console.log('- Research: Academic studies, peer-reviewed papers');
    console.log('- Legal: Court decisions, legal databases');
    console.log('- News: Reputable news sources (use sparingly)');
    
    return REPUTABLE_SOURCES_STRUCTURE;
}

/**
 * Validate a reputable source entry
 */
function validateReputableSource(source) {
    const errors = [];
    
    // Required fields
    if (!source.Disease_Ailment) errors.push('Disease_Ailment is required');
    if (!source.Source_Title) errors.push('Source_Title is required');
    if (!source.Source_URL) errors.push('Source_URL is required');
    if (!source.Source_Type) errors.push('Source_Type is required');
    if (!source.Priority) errors.push('Priority is required');
    if (!source.Keywords) errors.push('Keywords is required');
    
    // Validate URL format
    if (source.Source_URL && !isValidUrl(source.Source_URL)) {
        errors.push('Source_URL must be a valid URL');
    }
    
    // Validate priority (1-5)
    if (source.Priority && (source.Priority < 1 || source.Priority > 5)) {
        errors.push('Priority must be between 1 and 5');
    }
    
    // Validate source type
    const validTypes = ['Medical', 'Government', 'Research', 'Legal', 'News'];
    if (source.Source_Type && !validTypes.includes(source.Source_Type)) {
        errors.push(`Source_Type must be one of: ${validTypes.join(', ')}`);
    }
    
    return errors;
}

/**
 * Check if URL is valid
 */
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

/**
 * Generate sample data for testing
 */
function generateSampleData() {
    return REPUTABLE_SOURCES_STRUCTURE.sample_data;
}

/**
 * Instructions for setting up the Google Sheet
 */
function getSetupInstructions() {
    return `
# 📋 Reputable Sources Google Sheets Setup Instructions

## 1. Create the Sheet
1. Open your Google Spreadsheet
2. Create a new sheet named "Reputable_Sources"
3. Add the following columns in order:

## 2. Column Headers
${REPUTABLE_SOURCES_STRUCTURE.columns.map((col, i) => `${i + 1}. ${col}`).join('\n')}

## 3. Data Entry Guidelines

### Disease_Ailment
- Use the primary condition name (e.g., "Mesothelioma", "PFAS Exposure")
- Be consistent with naming across your other sheets
- This is the main category for organizing sources

### Source_Title
- Clear, descriptive title of the source
- Include the organization name when relevant
- Keep it concise but informative

### Source_URL
- Direct link to the specific page/article
- Must be a valid, accessible URL
- Test the link before adding

### Source_Type
- Medical: Mayo Clinic, NIH, medical journals
- Government: EPA, FDA, CDC, court records
- Research: Academic studies, peer-reviewed papers
- Legal: Court decisions, legal databases
- News: Reputable news sources (use sparingly)

### Priority (1-5)
- 1 = Highest priority (most authoritative)
- 2 = High priority (well-respected)
- 3 = Medium priority (good sources)
- 4 = Lower priority (acceptable)
- 5 = Lowest priority (basic)

### Keywords
- Comma-separated list of relevant terms
- Include variations and synonyms
- Think about how users might search for this topic
- Include both medical and common terms

### Description
- Brief explanation of what the source covers
- Helps with quality control and verification
- Keep it under 100 characters

### Last_Updated
- Date when you last verified the source
- Format: YYYY-MM-DD
- Update when you check the link

### Active
- TRUE = Include in AI responses
- FALSE = Exclude from responses
- Use FALSE for outdated or broken sources

## 4. Best Practices

### Source Quality
- Prioritize authoritative sources (government, medical institutions)
- Avoid blogs, forums, or unverified sources
- Prefer recent sources when possible
- Include diverse perspectives when appropriate

### Keyword Strategy
- Include both medical terms and common language
- Add synonyms and alternative spellings
- Consider related conditions and symptoms
- Think about user search patterns

### Priority Strategy
- Use Priority 1 for the most authoritative sources
- Reserve Priority 5 for basic, introductory sources
- Balance between comprehensiveness and quality
- Consider the source's reputation and expertise

### Maintenance
- Regularly check and update links
- Remove or deactivate broken sources
- Add new sources as they become available
- Review and adjust priorities as needed

## 5. Example Entry
| Disease_Ailment | Source_Title | Source_URL | Source_Type | Priority | Keywords | Description | Last_Updated | Active |
|-----------------|--------------|------------|-------------|----------|----------|-------------|--------------|--------|
| Mesothelioma | Mesothelioma - Mayo Clinic | https://www.mayoclinic.org/diseases-conditions/mesothelioma/symptoms-causes/syc-20375022 | Medical | 1 | mesothelioma, asbestos cancer, pleural mesothelioma | Comprehensive medical information about mesothelioma | 2024-01-15 | TRUE |

## 6. Testing
After setting up your sheet:
1. Test the integration with your AI system
2. Verify that sources are being returned for relevant queries
3. Check that priorities are working correctly
4. Ensure links are accessible and relevant
`;
}

// Export for use in other modules
export {
    REPUTABLE_SOURCES_STRUCTURE,
    createReputableSourcesTemplate,
    validateReputableSource,
    generateSampleData,
    getSetupInstructions
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    createReputableSourcesTemplate();
    console.log('\n' + getSetupInstructions());
} 