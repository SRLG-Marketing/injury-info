# 🎯 LIA Source Integration Guide

## Overview

The search functionality now automatically includes **Legal Injury Advocates (LIA) links** in the "Other Helpful Sources" section when a user's search query relates to cases that LIA is actively handling. This ensures that users searching for information about specific injury cases are directed to LIA's specialized legal assistance.

## 🚀 How It Works

### 1. **Smart Case Detection**
- System analyzes search queries against LIA's active cases in Google Sheets
- Uses sophisticated keyword matching to identify relevant cases
- Checks the "Legal Injury Advocates Active cases" sheet for active cases

### 2. **Automatic LIA Source Inclusion**
When an LIA active case is detected:
- System automatically includes a relevant LIA source in the search results
- LIA source is prioritized and appears first in the sources list
- Maintains the 5-source limit by replacing the least relevant source

### 3. **Case-Specific LIA Sources**
The system includes specific LIA sources for different case types:
- **Mesothelioma**: `https://legalinjuryadvocates.com/mesothelioma`
- **Talcum Powder**: `https://legalinjuryadvocates.com/talcum-powder`
- **Roundup**: `https://legalinjuryadvocates.com/roundup`
- **PFAS**: `https://legalinjuryadvocates.com/pfas`
- **Paraquat**: `https://legalinjuryadvocates.com/paraquat`
- **General**: `https://legalinjuryadvocates.com`

## 📊 Example Search Results

### ✅ **With LIA Case Detected:**
```
User searches: "What are mesothelioma symptoms?"

AI Response: [Helpful medical information about mesothelioma]

Other Helpful Sources:
• Legal Injury Advocates - Mesothelioma Cases (LIA) - Read More
• Mayo Clinic - Health Information (Medical) - Read More
• CDC - Health Information (Government) - Read More
```

### ❌ **Without LIA Case:**
```
User searches: "What is the weather like today?"

AI Response: [Weather information]

Other Helpful Sources:
• Mayo Clinic - Health Information (Medical) - Read More
• CDC - Health Information (Government) - Read More
```

## 🔧 Technical Implementation

### Core Components

#### 1. **DataIntegrationService.getReputableSources()**
```javascript
async getReputableSources(query, limit = 5) {
    // Check if query relates to LIA active case
    const liaCaseInfo = await this.checkLIAActiveCase(query);
    
    // Get relevant sources
    const relevantSources = await this.reputableSourcesService.findRelevantSources(query, limit);
    
    // If LIA case detected, ensure LIA source is included
    if (liaCaseInfo && liaCaseInfo.isActive) {
        const liaSources = allSources.filter(source => source.sourceType === 'LIA');
        const relevantLiaSource = this.findMostRelevantLIASource(liaSources, liaCaseInfo, query);
        
        // Add LIA source if not already present
        if (!hasLiaSource && relevantLiaSource) {
            relevantSources.unshift(relevantLiaSource);
        }
    }
    
    return relevantSources.slice(0, limit);
}
```

#### 2. **findMostRelevantLIASource()**
```javascript
findMostRelevantLIASource(liaSources, liaCaseInfo, query) {
    // Find case-specific LIA source first
    const caseSpecificSource = liaSources.find(source => {
        const sourceKeywords = this.parseKeywords(source.keywords);
        const caseKeywords = liaCaseInfo.keywords;
        
        return caseKeywords.some(caseKeyword => 
            sourceKeywords.some(sourceKeyword => 
                sourceKeyword.toLowerCase().includes(caseKeyword.toLowerCase())
            )
        );
    });
    
    return caseSpecificSource || liaSources.find(source => 
        source.diseaseAilment === 'Legal Assistance'
    );
}
```

### 3. **ReputableSourcesService Fallback Sources**
The system includes comprehensive LIA sources in the fallback data:

```javascript
{
    id: 'lia_mesothelioma',
    diseaseAilment: 'Mesothelioma',
    sourceTitle: 'Legal Injury Advocates - Mesothelioma Cases',
    sourceUrl: 'https://legalinjuryadvocates.com/mesothelioma',
    sourceType: 'LIA',
    priority: 1,
    keywords: 'mesothelioma, asbestos, asbestos exposure, lung cancer, legal help, compensation',
    active: true
}
```

## 🎮 Google Sheets Integration

### Required Setup

#### 1. **LIA Active Cases Sheet**
Ensure your Google Sheets has the "Legal Injury Advocates Active cases" tab with:
- `Case Type` column
- `Active` column (TRUE/FALSE)
- `Keywords` column
- `Description` column

#### 2. **Reputable Sources Sheet**
Add LIA sources to your "Reputable_Sources" tab:

| Disease_Ailment | Source_Title | Source_URL | Source_Type | Priority | Keywords |
|-----------------|--------------|------------|-------------|----------|----------|
| Mesothelioma | Legal Injury Advocates - Mesothelioma Cases | https://legalinjuryadvocates.com/mesothelioma | LIA | 1 | mesothelioma, asbestos, legal help |
| Talcum Powder | Legal Injury Advocates - Talcum Powder Cases | https://legalinjuryadvocates.com/talcum-powder | LIA | 1 | talcum powder, ovarian cancer, legal help |

## 🧪 Testing

### Run the Test Script
```bash
node test-lia-sources.js
```

This will test:
- ✅ LIA case detection for various queries
- ✅ LIA source inclusion in search results
- ✅ Case-specific LIA source selection
- ✅ Non-legal query handling

### Manual Testing
1. **Search for mesothelioma**: Should include LIA mesothelioma source
2. **Search for talcum powder**: Should include LIA talcum powder source
3. **Search for weather**: Should NOT include LIA sources

## 📈 Benefits

### For Users
- **Relevant Legal Help**: Users get directed to specialized legal assistance
- **Case-Specific Resources**: Links go to the most relevant LIA page
- **Trusted Source**: LIA is a reputable legal firm for injury cases

### For LIA
- **Targeted Traffic**: Only users with relevant cases see LIA links
- **Case-Specific Landing Pages**: Users land on the most relevant page
- **Quality Leads**: Users are already researching their specific injury

### For the System
- **Smart Integration**: Only shows LIA sources when relevant
- **Maintains Quality**: Still includes medical and government sources
- **Scalable**: Easy to add new case types and sources

## 🔄 Adding New Case Types

### 1. **Add to Google Sheets**
- Add new case to "Legal Injury Advocates Active cases" sheet
- Set `Active` to `TRUE`
- Add relevant keywords

### 2. **Add LIA Source**
- Add corresponding source to "Reputable_Sources" sheet
- Set `Source_Type` to `LIA`
- Set `Priority` to `1`
- Include case-specific keywords

### 3. **Update Fallback Sources**
- Add to `getFallbackSources()` in `reputable-sources-service.js`
- Include case-specific URL and keywords

### 4. **Test**
- Run `node test-lia-sources.js`
- Verify case detection and source inclusion

## 🚨 Troubleshooting

### Common Issues

#### LIA Sources Not Appearing
1. **Check Google Sheets**: Ensure LIA cases are marked as active
2. **Verify Keywords**: Make sure case keywords match search queries
3. **Check Fallback**: System should use fallback sources if Google Sheets unavailable

#### Wrong LIA Source Selected
1. **Review Keywords**: Ensure source keywords match case keywords
2. **Check Priority**: LIA sources should have priority 1
3. **Verify URL**: Ensure LIA URLs are correct and accessible

#### Performance Issues
1. **Cache**: System caches sources for 10 minutes
2. **Indexing**: Large datasets are indexed for faster searches
3. **Fallback**: System gracefully falls back if services unavailable

## 📞 Support

For technical issues or questions about the LIA source integration:
1. Check the test logs: `node test-lia-sources.js`
2. Review Google Sheets configuration
3. Verify fallback sources are working
4. Check server logs for error messages

---

**🎯 Result**: Users searching for injury cases now automatically get directed to Legal Injury Advocates for specialized legal assistance, while maintaining the quality and relevance of all search results. 