# 🏛️ Legal Injury Advocates - Reputable Sources Setup

## 🎯 Overview

Your reputable sources system has been enhanced to **always include at least one Legal Injury Advocates (LIA) source** in every AI response. This ensures that LIA links appear consistently in the "Other Helpful Sources" section, providing users with legal assistance options alongside medical and government sources.

## 🚀 How It Works

### Automatic LIA Source Inclusion
- **Total Sources**: 4 sources per response (increased from 3)
- **LIA Sources**: Always includes 1 LIA source
- **Other Sources**: 3 additional reputable sources (medical, government, research)
- **Fallback Protection**: If Google Sheets is unavailable, fallback LIA sources are used

### Source Priority
1. **LIA Source**: Always included (highest scoring LIA source)
2. **Medical Sources**: Mayo Clinic, NIH, CDC, etc.
3. **Government Sources**: FDA, EPA, court records
4. **Research Sources**: Academic studies, peer-reviewed papers

## 📊 Google Sheets Setup

### Add LIA Sources to Your "Reputable_Sources" Sheet

Add these columns to your existing Google Sheets "Reputable_Sources" tab:

| Disease_Ailment | Source_Title | Source_URL | Source_Type | Priority | Keywords | Description | Last_Updated | Active |
|-----------------|--------------|------------|-------------|----------|----------|-------------|--------------|--------|
| Legal Assistance | Legal Injury Advocates - Free Case Evaluation | https://legalinjuryadvocates.com | LIA | 1 | legal help, injury claims, compensation, lawsuit, legal advice, case evaluation | Free case evaluation and legal assistance for injury claims | 2024-01-15 | TRUE |
| Mesothelioma | Legal Injury Advocates - Mesothelioma Cases | https://legalinjuryadvocates.com/mesothelioma | LIA | 1 | mesothelioma, asbestos, legal help, compensation | Specialized legal assistance for mesothelioma cases | 2024-01-15 | TRUE |
| PFAS Exposure | Legal Injury Advocates - PFAS Lawsuits | https://legalinjuryadvocates.com/pfas | LIA | 1 | pfas, forever chemicals, water contamination, legal help | Legal assistance for PFAS exposure claims | 2024-01-15 | TRUE |
| Roundup Cancer | Legal Injury Advocates - Roundup Lawsuits | https://legalinjuryadvocates.com/roundup | LIA | 1 | roundup, glyphosate, weed killer, cancer, legal help | Legal assistance for Roundup cancer cases | 2024-01-15 | TRUE |

### Key Guidelines for LIA Sources

1. **Source_Type**: Use whatever label you want - it will display exactly as you type it
   - Examples: "Legal Injury Advocates", "LIA Blog Post", "LIA", "Legal Help"
2. **Priority**: Always set to 1 (highest priority)
3. **Keywords**: Include relevant case-specific terms plus "legal help", "compensation", "lawsuit"
4. **Active**: Always set to TRUE
5. **URLs**: Use specific landing pages when available

**Note:** The system displays your `Source_Type` exactly as you typed it in Google Sheets - no mapping or processing is done.

## 🔧 System Configuration

### Current Settings
- **Total Sources**: 4 per response
- **LIA Sources**: 1 guaranteed per response
- **Fallback**: Built-in LIA sources when Google Sheets unavailable
- **Source Types**: Medical, Government, Research, Legal, LIA

### How Sources Are Selected
1. **LIA Sources**: System finds all LIA sources, scores them, picks highest scoring
2. **Regular Sources**: System finds relevant medical/government sources, scores them
3. **Deduplication**: System removes any duplicate URLs to ensure unique sources
4. **Final Selection**: 1 LIA source + 3 best unique regular sources = 4 total sources

## 🧪 Testing

Test the LIA source inclusion:

```bash
node test-reputable-sources.js
```

This will verify that:
- LIA sources are properly detected
- At least one LIA source appears in every response
- Sources are properly formatted and linked
- Fallback LIA sources work when Google Sheets is unavailable

## 📱 Example Response

When a user asks about mesothelioma, they'll see:

```
Mesothelioma is a serious cancer that affects the lining of the lungs...

**Other Helpful Sources:**
• **Legal Injury Advocates - Free Case Evaluation** (Legal Injury Advocates) - Read More
• **Mesothelioma - Mayo Clinic** (Medical Authority) - Read More
• **Mesothelioma Information - NIH** (Government Source) - Read More
• **Asbestos Exposure - CDC** (Government Source) - Read More
```

## 🎯 Benefits

1. **Consistent Legal Help**: Users always see legal assistance options
2. **Balanced Information**: Legal help alongside medical/government sources
3. **Improved Conversions**: LIA links appear in every response
4. **Professional Appearance**: Sources are properly formatted and labeled
5. **Fallback Protection**: System works even when Google Sheets is down
6. **No Duplicates**: Advanced deduplication ensures no duplicate URLs appear

## 🔍 Monitoring

The system logs LIA source inclusion:
- `Found X relevant sources for query (including Y LIA sources)`
- `LIA source successfully included!`
- `Using fallback LIA sources`

## 🚨 Troubleshooting

### No LIA Sources Appearing
1. Check Google Sheets "Reputable_Sources" tab
2. Verify LIA sources have `Active = TRUE`
3. Confirm `Source_Type = "LIA"` or similar
4. Test with: `node test-reputable-sources.js`

### LIA Sources Not Being Detected
1. Check source title includes "Legal Injury Advocates"
2. Verify URL contains "legalinjuryadvocates.com"
3. Confirm Source_Type is "LIA" or "Legal Injury Advocates"

### System Using Fallback Sources
1. Check Google Sheets API connection
2. Verify sheet name "Reputable_Sources" exists
3. Confirm API credentials are working

## 📋 Maintenance

### Regular Tasks
1. **Update LIA URLs**: Ensure links point to current landing pages
2. **Add New Cases**: Create LIA sources for new case types
3. **Monitor Performance**: Check that LIA sources are appearing
4. **Review Keywords**: Update keywords based on user queries

### Monthly Review
- Verify all LIA links are working
- Add new LIA sources for trending cases
- Update keywords based on query analytics
- Check fallback sources are current

## 🎉 Success Metrics

The system is working correctly when:
- ✅ Every AI response includes 4 reputable sources
- ✅ At least 1 source is always a Legal Injury Advocates link
- ✅ LIA sources show their original source type (e.g., "Legal Injury Advocates", "LIA Blog Post")
- ✅ System works even when Google Sheets is unavailable
- ✅ Sources are relevant to user queries
- ✅ No duplicate URLs appear in the source list

Your users now have consistent access to legal assistance alongside authoritative medical and government information! 