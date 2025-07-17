# 📚 Reputable Sources Integration Guide

## 🎯 Overview

Your injury information website now includes a sophisticated reputable sources system that automatically provides verified, authoritative links in AI responses. This system pulls from a Google Sheet and intelligently matches user queries to relevant sources based on keywords and priorities.

## 🚀 Quick Start

### 1. Create the Google Sheet

1. **Open your existing Google Spreadsheet** (the one you're already using for other data)
2. **Create a new sheet** named `Reputable_Sources`
3. **Add the following columns** in this exact order:

| Column Name | Description | Example |
|-------------|-------------|---------|
| Disease_Ailment | Primary condition name | "Mesothelioma" |
| Source_Title | Title of the source | "Mesothelioma - Mayo Clinic" |
| Source_URL | Direct link to source | "https://www.mayoclinic.org/..." |
| Source_Type | Type of source | "Medical" |
| Priority | Priority (1-5) | 1 |
| Keywords | Comma-separated keywords | "mesothelioma, asbestos cancer" |
| Description | Brief description | "Comprehensive medical information" |
| Last_Updated | Date verified | "2024-01-15" |
| Active | TRUE/FALSE | TRUE |

### 2. Add Sample Data

Start with these example entries:

| Disease_Ailment | Source_Title | Source_URL | Source_Type | Priority | Keywords | Description | Last_Updated | Active |
|-----------------|--------------|------------|-------------|----------|----------|-------------|--------------|--------|
| Mesothelioma | Mesothelioma - Mayo Clinic | https://www.mayoclinic.org/diseases-conditions/mesothelioma/symptoms-causes/syc-20375022 | Medical | 1 | mesothelioma, asbestos cancer, pleural mesothelioma | Comprehensive medical information about mesothelioma | 2024-01-15 | TRUE |
| PFAS Exposure | PFAS Chemicals - EPA | https://www.epa.gov/pfas | Government | 1 | pfas, forever chemicals, water contamination | Official EPA information about PFAS chemicals | 2024-01-10 | TRUE |
| Roundup Cancer | Glyphosate and Cancer Risk - American Cancer Society | https://www.cancer.org/cancer/risk-prevention/chemicals/glyphosate.html | Medical | 1 | roundup, glyphosate, weed killer cancer | Scientific information about glyphosate cancer risks | 2024-01-12 | TRUE |

### 3. Test the Integration

The system is already integrated into your AI chat endpoint. When users ask questions, the AI will automatically include relevant reputable sources in the response.

## 📊 How It Works

### 1. Query Matching
- User asks: "What is mesothelioma?"
- System extracts keywords: ["mesothelioma"]
- Matches against source keywords
- Returns relevant sources sorted by priority

### 2. Priority System
- **Priority 1**: Most authoritative (Mayo Clinic, EPA, FDA)
- **Priority 2**: High quality (NIH, CDC, major medical centers)
- **Priority 3**: Good sources (academic institutions)
- **Priority 4**: Acceptable sources (reputable news)
- **Priority 5**: Basic sources (use sparingly)

### 3. Source Types
- **Medical**: Mayo Clinic, NIH, medical journals
- **Government**: EPA, FDA, CDC, court records
- **Research**: Academic studies, peer-reviewed papers
- **Legal**: Court decisions, legal databases
- **News**: Reputable news sources (use sparingly)

## 🔧 API Endpoints

### Get Reputable Sources for Query
```bash
GET /api/reputable-sources?query=mesothelioma&limit=3
```

**Response:**
```json
{
  "sources": [
    {
      "id": "source_1",
      "diseaseAilment": "Mesothelioma",
      "sourceTitle": "Mesothelioma - Mayo Clinic",
      "sourceUrl": "https://www.mayoclinic.org/...",
      "sourceType": "Medical",
      "priority": 1,
      "description": "Comprehensive medical information",
      "lastUpdated": "2024-01-15"
    }
  ],
  "total": 1,
  "query": "mesothelioma"
}
```

### Get Reputable Sources for Disease
```bash
GET /api/reputable-sources?disease=PFAS Exposure&limit=5
```

### AI Chat Response (Enhanced)
The `/api/chat` endpoint now includes reputable sources:

```json
{
  "response": "Mesothelioma is a serious cancer...\n\n**Reputable Sources:**\n• **Mesothelioma - Mayo Clinic** (Medical Authority) - https://www.mayoclinic.org/...",
  "reputableSources": [
    {
      "title": "Mesothelioma - Mayo Clinic",
      "url": "https://www.mayoclinic.org/...",
      "type": "Medical",
      "priority": 1
    }
  ]
}
```

## 📝 Best Practices

### 1. Source Quality
- **Prioritize authoritative sources**: Government agencies, major medical institutions
- **Avoid**: Blogs, forums, unverified websites
- **Verify links regularly**: Check that URLs still work
- **Update frequently**: Keep sources current

### 2. Keyword Strategy
- **Include variations**: "mesothelioma", "asbestos cancer", "pleural mesothelioma"
- **Think like users**: Include common terms people search for
- **Medical + common terms**: Both technical and everyday language
- **Synonyms**: Include alternative spellings and terms

### 3. Priority Strategy
- **Use Priority 1 sparingly**: Only for the most authoritative sources
- **Balance coverage**: Don't overload with too many Priority 1 sources
- **Consider expertise**: Match source type to topic (medical for medical, legal for legal)
- **Regular review**: Adjust priorities based on source quality

### 4. Maintenance
- **Monthly review**: Check all links are working
- **Quarterly updates**: Add new sources, remove outdated ones
- **Quality control**: Ensure sources remain relevant and authoritative
- **Performance monitoring**: Watch for sources that don't get used

## 🛠️ Advanced Configuration

### Custom Source Types
You can add custom source types by updating the `getSourceTypeLabel` method in `reputable-sources-service.js`:

```javascript
getSourceTypeLabel(sourceType) {
  const labels = {
    'Medical': 'Medical Authority',
    'Government': 'Government Source',
    'Research': 'Research Study',
    'Legal': 'Legal Database',
    'News': 'News Source',
    'Custom': 'Custom Source' // Add your own
  };
  return labels[sourceType] || sourceType;
}
```

### Adjusting Relevance Scoring
Modify the scoring algorithm in `calculateRelevanceScore` method:

```javascript
// Increase keyword match weight
if (sourceKeywords.includes(queryWord)) {
  score += 15; // Was 10, now 15
}

// Add bonus for exact disease match
if (sourceDisease.includes(diseaseLower)) {
  score += 25; // Was 20, now 25
}
```

### Caching Configuration
Adjust cache duration in the constructor:

```javascript
this.cacheTimeout = 15 * 60 * 1000; // 15 minutes instead of 10
```

## 🔍 Troubleshooting

### Sources Not Appearing
1. **Check sheet name**: Must be exactly `Reputable_Sources`
2. **Verify column names**: Must match exactly (case-sensitive)
3. **Check Active column**: Must be `TRUE` (not `true` or `True`)
4. **Validate URLs**: Ensure all URLs are valid and accessible
5. **Check keywords**: Make sure keywords are comma-separated

### Poor Matching
1. **Review keywords**: Add more variations and synonyms
2. **Check priority**: Lower priority sources might not appear if limit is low
3. **Test queries**: Use the API endpoint to test specific queries
4. **Adjust scoring**: Modify the relevance scoring algorithm

### Performance Issues
1. **Reduce cache time**: Lower the cache timeout
2. **Limit results**: Reduce the default limit in API calls
3. **Optimize keywords**: Remove unnecessary keywords
4. **Monitor usage**: Check which sources are being used most

## 📈 Analytics

The system provides analytics on source usage:

- **Source frequency**: Which sources are used most
- **Query matching**: How well keywords match user queries
- **Priority effectiveness**: Whether priority system is working
- **Source quality**: User engagement with different source types

## 🚀 Next Steps

1. **Populate your sheet** with sources for your main conditions
2. **Test with real queries** to see how sources appear
3. **Refine keywords** based on user search patterns
4. **Add more sources** as you identify gaps
5. **Monitor performance** and adjust priorities as needed

## 📞 Support

If you need help setting up or troubleshooting:

1. **Check the logs**: Look for error messages in your server console
2. **Test the API**: Use the `/api/reputable-sources` endpoint to test
3. **Validate data**: Use the validation functions in the setup script
4. **Review examples**: Check the sample data for proper formatting

The reputable sources system is now fully integrated and will automatically enhance your AI responses with verified, authoritative links! 