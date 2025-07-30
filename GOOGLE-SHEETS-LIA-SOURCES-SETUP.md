# 📊 Google Sheets LIA Sources Setup Guide

## Overview

To enable the LIA source integration, you need to add Legal Injury Advocates sources to your Google Sheets "Reputable_Sources" tab. This will allow the system to pull LIA links directly from Google Sheets instead of relying on fallback sources.

## 🎯 Required Google Sheets Setup

### Tab Name: `Reputable_Sources`

### Required Columns:
| Column Name | Description | Example |
|-------------|-------------|---------|
| `Disease_Ailment` | The condition or case type | "Mesothelioma" |
| `Source_Title` | Display name for the source | "Legal Injury Advocates - Mesothelioma Cases" |
| `Source_URL` | The actual URL | "https://legalinjuryadvocates.com/mesothelioma" |
| `Source_Type` | Type of source (must be "LIA") | "LIA" |
| `Priority` | Priority level (1 = highest) | "1" |
| `Keywords` | Comma-separated keywords | "mesothelioma, asbestos, legal help" |
| `Description` | Brief description | "Legal assistance for mesothelioma cases" |
| `Last_Updated` | Date last updated | "2024-01-15" |
| `Active` | Whether source is active | "TRUE" |

## 📋 LIA Sources to Add

### 1. **General LIA Source**
```
Disease_Ailment: Legal Assistance
Source_Title: Legal Injury Advocates - Free Case Evaluation
Source_URL: https://legalinjuryadvocates.com
Source_Type: LIA
Priority: 1
Keywords: legal help, injury claims, compensation, lawsuit, legal advice, case evaluation
Description: Free case evaluation and legal assistance for injury claims
Last_Updated: 2024-01-15
Active: TRUE
```

### 2. **Mesothelioma Cases**
```
Disease_Ailment: Mesothelioma
Source_Title: Legal Injury Advocates - Mesothelioma Cases
Source_URL: https://legalinjuryadvocates.com/mesothelioma
Source_Type: LIA
Priority: 1
Keywords: mesothelioma, asbestos, asbestos exposure, lung cancer, pleural mesothelioma, legal help, compensation
Description: Specialized legal assistance for mesothelioma and asbestos exposure cases
Last_Updated: 2024-01-15
Active: TRUE
```

### 3. **Talcum Powder Cases**
```
Disease_Ailment: Talcum Powder
Source_Title: Legal Injury Advocates - Talcum Powder Cases
Source_URL: https://legalinjuryadvocates.com/talcum-powder
Source_Type: LIA
Priority: 1
Keywords: talcum powder, talc, baby powder, ovarian cancer, johnson & johnson, legal help, compensation
Description: Legal assistance for talcum powder and ovarian cancer cases
Last_Updated: 2024-01-15
Active: TRUE
```

### 4. **Roundup Cases**
```
Disease_Ailment: Roundup
Source_Title: Legal Injury Advocates - Roundup Cases
Source_URL: https://legalinjuryadvocates.com/roundup
Source_Type: LIA
Priority: 1
Keywords: roundup, glyphosate, weedkiller, non-hodgkin lymphoma, bayer, monsanto, legal help, compensation
Description: Legal assistance for Roundup weedkiller and cancer cases
Last_Updated: 2024-01-15
Active: TRUE
```

### 5. **PFAS Cases**
```
Disease_Ailment: PFAS Exposure
Source_Title: Legal Injury Advocates - PFAS Lawsuits
Source_URL: https://legalinjuryadvocates.com/pfas
Source_Type: LIA
Priority: 1
Keywords: pfas, forever chemicals, water contamination, legal help, compensation, environmental exposure
Description: Legal assistance for PFAS exposure and water contamination claims
Last_Updated: 2024-01-15
Active: TRUE
```

### 6. **Paraquat Cases**
```
Disease_Ailment: Paraquat
Source_Title: Legal Injury Advocates - Paraquat Cases
Source_URL: https://legalinjuryadvocates.com/paraquat
Source_Type: LIA
Priority: 1
Keywords: paraquat, herbicide, parkinson, parkinsons disease, legal help, compensation
Description: Legal assistance for Paraquat herbicide and Parkinson's disease cases
Last_Updated: 2024-01-15
Active: TRUE
```

## 🔧 Step-by-Step Setup Instructions

### Step 1: Open Your Google Sheets
1. Navigate to your Google Sheets document
2. Find or create the "Reputable_Sources" tab
3. Ensure the required columns are present

### Step 2: Add LIA Sources
1. Add each LIA source as a new row in the "Reputable_Sources" tab
2. Copy the data from the examples above
3. Make sure `Source_Type` is set to "LIA" (exactly as shown)
4. Set `Priority` to "1" for all LIA sources
5. Set `Active` to "TRUE" for all LIA sources

### Step 3: Verify Column Headers
Ensure your column headers match exactly:
- `Disease_Ailment`
- `Source_Title`
- `Source_URL`
- `Source_Type`
- `Priority`
- `Keywords`
- `Description`
- `Last_Updated`
- `Active`

### Step 4: Test the Integration
1. Run the test script: `node test-lia-sources.js`
2. Check that LIA sources are being pulled from Google Sheets
3. Verify that the correct LIA source appears for each case type

## 🧪 Testing the Setup

### Run the Test Script
```bash
node test-lia-sources.js
```

### Expected Results
When Google Sheets is properly configured, you should see:
- ✅ "📊 Fetching reputable sources from Google Sheets..."
- ✅ "✅ Fetched X active reputable sources"
- ✅ LIA sources appearing in search results for relevant queries

### Manual Testing
1. **Search for "mesothelioma symptoms"** → Should show LIA mesothelioma source
2. **Search for "talcum powder cancer"** → Should show LIA talcum powder source
3. **Search for "weather today"** → Should NOT show LIA sources

## 🚨 Troubleshooting

### LIA Sources Not Appearing
1. **Check Google Sheets**: Ensure LIA sources are added to "Reputable_Sources" tab
2. **Verify Source_Type**: Must be exactly "LIA" (case-sensitive)
3. **Check Active Status**: Ensure `Active` column is set to "TRUE"
4. **Verify URLs**: Ensure all URLs are valid and accessible

### Wrong LIA Source Selected
1. **Review Keywords**: Make sure keywords match the case types
2. **Check Priority**: LIA sources should have priority "1"
3. **Verify Disease_Ailment**: Should match the case type exactly

### Google Sheets Connection Issues
1. **Check API Key**: Ensure `GOOGLE_API_KEY` environment variable is set
2. **Verify Spreadsheet ID**: Ensure `GOOGLE_SPREADSHEET_ID` is correct
3. **Check Permissions**: Ensure the API key has access to the spreadsheet

## 📊 Example Google Sheets Layout

| Disease_Ailment | Source_Title | Source_URL | Source_Type | Priority | Keywords | Description | Last_Updated | Active |
|-----------------|--------------|------------|-------------|----------|----------|-------------|--------------|--------|
| Mesothelioma | Legal Injury Advocates - Mesothelioma Cases | https://legalinjuryadvocates.com/mesothelioma | LIA | 1 | mesothelioma, asbestos, legal help | Legal assistance for mesothelioma cases | 2024-01-15 | TRUE |
| Talcum Powder | Legal Injury Advocates - Talcum Powder Cases | https://legalinjuryadvocates.com/talcum-powder | LIA | 1 | talcum powder, ovarian cancer, legal help | Legal assistance for talcum powder cases | 2024-01-15 | TRUE |
| Mayo Clinic | Mayo Clinic - Health Information | https://www.mayoclinic.org | Medical | 2 | health, medical, symptoms | Comprehensive medical information | 2024-01-15 | TRUE |

## 🎯 Benefits of Google Sheets Integration

### Dynamic Management
- **No Code Changes**: Add/remove LIA sources without touching code
- **Real-time Updates**: Changes take effect immediately
- **Business-Friendly**: Non-technical users can manage sources

### Scalability
- **Easy Expansion**: Add new case types and sources easily
- **Flexible Keywords**: Adjust keywords to improve matching
- **Priority Control**: Control which sources appear first

### Reliability
- **Fallback Protection**: System uses fallback sources if Google Sheets unavailable
- **Caching**: Sources are cached for performance
- **Validation**: System validates all sources before use

---

**🎯 Result**: Once configured, your search system will automatically pull LIA sources from Google Sheets and include them in search results when users search for relevant injury cases. 