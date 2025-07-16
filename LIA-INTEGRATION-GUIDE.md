# LIA Integration Guide

## Overview

The system automatically detects when users ask about cases that Legal Injury Advocates (LIA) is actively handling and prompts them to visit `legalinjuryadvocates.com`.

## How It Works

### 1. **Case Detection**
- System checks user queries against LIA active cases in Google Sheets
- Uses keyword matching to identify relevant cases
- Searches the "Legal Injury Advocates Active cases" sheet

### 2. **Automatic Prompting**
When an active case is detected:
- AI response includes LIA referral
- Mentions that LIA is actively handling the case
- Directs users to `legalinjuryadvocates.com`

### 3. **Response Enhancement**
- Adds case information to AI context
- Uses specialized system prompts for LIA cases
- Includes case details in API response

## Google Sheets Setup

### Required Sheet: "Legal Injury Advocates Active cases"

| Column | Description | Example |
|--------|-------------|---------|
| `Case Type` | Name of the case type | "Mesothelioma" |
| `Name` | Alternative name field | "Asbestos Cases" |
| `Description` | Case description | "Mesothelioma and asbestos exposure cases" |
| `Keywords` | Comma-separated search terms | "mesothelioma, asbestos, asbestos exposure" |
| `Active` | Whether case is active (true/false) | "true" |
| `Status` | Alternative status field | "active" |
| `Last Updated` | When case was last updated | "2024-01-15" |

### Example Row:
```
Case Type: Mesothelioma
Description: Mesothelioma and asbestos exposure cases
Keywords: mesothelioma, asbestos, asbestos exposure, lung cancer
Active: true
Last Updated: 2024-01-15
```

## API Response Format

When an LIA case is detected, the chat response includes:

```json
{
  "response": "AI response with LIA referral...",
  "verified": true,
  "warnings": [],
  "claimsVerified": 2,
  "liaCase": {
    "isActive": true,
    "caseType": "mesothelioma",
    "name": "Mesothelioma",
    "description": "Mesothelioma and asbestos exposure cases",
    "keywords": ["mesothelioma", "asbestos", "asbestos exposure"]
  },
  "usage": { ... }
}
```

## Testing

### Test LIA Detection:
```bash
node test-lia-detection.js
```

### Manual API Test:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are mesothelioma symptoms?"}'
```

### Direct Case Check:
```bash
curl -X POST http://localhost:3000/api/lia/check-case \
  -H "Content-Type: application/json" \
  -d '{"query": "asbestos exposure"}'
```

## Example AI Responses

### With LIA Case Detected:
> "Mesothelioma symptoms include chest pain, shortness of breath, and fatigue. If you or a loved one has been affected by mesothelioma, Legal Injury Advocates is currently handling these cases and can help you understand your legal options. You can start your claim at legalinjuryadvocates.com."

### Without LIA Case:
> "I can provide general information about injury cases, but for specific legal advice, I recommend consulting with qualified attorneys."

## Configuration

### Environment Variables:
- `GOOGLE_API_KEY` - Google Sheets API access
- `GOOGLE_SPREADSHEET_ID` - Spreadsheet containing LIA cases

### Fallback Cases:
If Google Sheets is unavailable, system uses fallback cases:
- Mesothelioma/asbestos cases
- Talcum powder cases

## Adding New Cases

1. **Add to Google Sheets:**
   - Open "Legal Injury Advocates Active cases" sheet
   - Add new row with case details
   - Set `Active` to "true"
   - Add relevant keywords

2. **Test the Integration:**
   - Ask about the new case type
   - Verify LIA referral appears
   - Check API response includes case info

## Troubleshooting

### Case Not Detected:
- Check keywords in Google Sheets
- Verify case is marked as active
- Test with direct API call

### No LIA Referral:
- Check if case exists in database
- Verify system message is being used
- Review API response for `liaCase` field

### Google Sheets Issues:
- Check API key permissions
- Verify spreadsheet ID
- Check sheet name matches exactly

## Benefits

✅ **Automatic Lead Generation** - Captures potential clients  
✅ **Relevant Referrals** - Only prompts for active cases  
✅ **Data-Driven** - Based on actual case database  
✅ **Scalable** - Easy to add new cases via Google Sheets  
✅ **Fallback Support** - Works even if sheets are unavailable  