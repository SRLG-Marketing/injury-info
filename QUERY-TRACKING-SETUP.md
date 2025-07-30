# Query Tracking System Setup Guide

## Overview

The enhanced Query Tracking System provides comprehensive analytics for all user queries, with automatic HubSpot integration for CRM data. This system tracks queries in real-time, provides detailed analytics, and sends data to HubSpot for lead management.

## Features

- **Real-time Query Tracking**: Tracks all user queries with detailed metadata
- **HubSpot Integration**: Automatically sends query data to HubSpot CRM
- **Analytics Dashboard**: Web-based dashboard for viewing analytics
- **Data Export**: CSV export functionality for data analysis
- **Batch Processing**: Efficient batch processing to avoid API rate limits
- **Serverless Support**: Works in both traditional and serverless environments

## Quick Start

### 1. Environment Variables

Add these environment variables to your `.env.local` file:

```bash
# Query Tracking Configuration
ENABLE_HUBSPOT_TRACKING=true
ENABLE_FILE_LOGGING=true
QUERY_BATCH_SIZE=10
QUERY_BATCH_TIMEOUT=60000

# Analytics Dashboard Authentication (REQUIRED - CHANGE THESE!)
ANALYTICS_USERNAME=your_admin_username
ANALYTICS_PASSWORD=your_secure_password
ANALYTICS_SESSION_TIMEOUT=14400000

# HubSpot Configuration (if using HubSpot integration)
HUBSPOT_ACCESS_TOKEN=your_hubspot_access_token
HUBSPOT_PORTAL_ID=your_hubspot_portal_id
ANALYTICS_EMAIL_DOMAIN=yourdomain.com

# Optional: External logging for serverless environments
EXTERNAL_LOGGING_URL=https://your-logging-service.com/api/logs
EXTERNAL_LOGGING_API_KEY=your_api_key
```

### 2. Start the Server

```bash
npm start
```

### 3. Access the Dashboard

Open your browser and navigate to:
```
http://localhost:3000/analytics-dashboard.html
```

**⚠️ IMPORTANT:** The dashboard is now protected with authentication. You must use the credentials you set in your environment variables to access it.

## API Endpoints

### Analytics Endpoints

All analytics endpoints are available under `/api/analytics/`:

#### Get System Status
```http
GET /api/analytics/status
```

#### Get Real-time Statistics
```http
GET /api/analytics/realtime
```

#### Get Analytics Summary
```http
GET /api/analytics/summary?days=30&refresh=false
```

#### Get Top Keywords
```http
GET /api/analytics/keywords?days=30&limit=20
```

#### Get LIA Case Statistics
```http
GET /api/analytics/lia-cases?days=30
```

#### Get Recent Queries
```http
GET /api/analytics/recent-queries?days=7&limit=50
```

#### Export CSV Data
```http
GET /api/analytics/export/csv?days=30
```

#### Manually Track a Query
```http
POST /api/analytics/track
Content-Type: application/json

{
  "query": "What are the symptoms of mesothelioma?",
  "source": "api",
  "metadata": {
    "userId": "user123",
    "sessionId": "session456"
  }
}
```

#### Clean Up Old Data
```http
POST /api/analytics/cleanup
```

#### Check HubSpot Status
```http
GET /api/analytics/hubspot-status
```

#### Get Dashboard Data
```http
GET /api/analytics/dashboard?days=30
```

#### Authentication Endpoints

##### Login
```http
POST /api/analytics/login
Content-Type: application/json

{
  "username": "your_admin_username",
  "password": "your_secure_password"
}
```

##### Logout
```http
POST /api/analytics/logout
Authorization: Bearer your_session_token
```

##### Get Session Info
```http
GET /api/analytics/session
Authorization: Bearer your_session_token
```

## HubSpot Integration

### Setup

1. **Get HubSpot API Credentials**:
   - Go to HubSpot Settings → Integrations → API Keys
   - Create a new API key
   - Note your Portal ID

2. **Configure Environment Variables**:
   ```bash
   HUBSPOT_ACCESS_TOKEN=your_access_token
   HUBSPOT_PORTAL_ID=your_portal_id
   ENABLE_HUBSPOT_TRACKING=true
   ```

3. **Test the Connection**:
   - Visit `/api/analytics/hubspot-status` to verify the connection
   - Check the dashboard for HubSpot integration status

### What Gets Sent to HubSpot

The system sends the following data to HubSpot:

- **Individual Queries**: Each user query is logged as a note
- **Batch Summaries**: Periodic summaries of query batches
- **Contact Information**: Creates/updates contacts with query data
- **Analytics Data**: Query patterns and trends

### HubSpot Data Structure

```javascript
// Contact Properties
{
  email: "analytics@yourdomain.com",
  firstname: "Analytics",
  lastname: "User",
  injury_condition_searched: "mesothelioma",
  law_firm_location_searched: "California",
  settlement_calculation_requested: true,
  last_interaction_date: "2024-01-15T10:30:00Z",
  lead_source: "AI Assistant"
}

// Notes
{
  hs_note_body: "Query: What are mesothelioma symptoms?\nSource: chatbot\nTimestamp: 2024-01-15T10:30:00Z",
  hs_timestamp: "2024-01-15T10:30:00Z"
}
```

## Data Structure

### Query Data Fields

Each tracked query includes:

```javascript
{
  queryId: "query_1705312200000_abc123def",
  timestamp: "2024-01-15T10:30:00.000Z",
  query: "What are the symptoms of mesothelioma?",
  keywords: ["symptoms", "mesothelioma"],
  liaCaseType: "mesothelioma",
  liaCaseInfo: { /* LIA case details */ },
  userAgent: "Mozilla/5.0...",
  ipAddress: "192.168.1.1",
  sessionId: "session_123",
  pageUrl: "https://example.com/chat",
  referrer: "https://google.com",
  responseTime: 1250,
  sourcesFound: 3,
  articlesFound: 2,
  lawFirmsFound: 1,
  settlementsFound: 0,
  isLegalQuery: true,
  userLocation: "California",
  deviceType: "desktop",
  browser: "chrome",
  os: "windows",
  source: "chatbot",
  environment: "production",
  version: "1.0.0"
}
```

### Analytics Data

The system provides analytics on:

- **Total Queries**: Number of queries in a time period
- **Top Keywords**: Most frequently searched terms
- **LIA Case Statistics**: Breakdown by case type
- **Device/Browser Analytics**: User device information
- **Response Times**: Performance metrics
- **Source Distribution**: Where queries come from

## Configuration Options

### QueryTracker Configuration

```javascript
const queryTracker = new QueryTracker({
  hubspotConnector: hubspotConnector,
  enableHubSpotTracking: true,
  enableFileLogging: true,
  batchSize: 10,           // Number of queries to batch
  batchTimeout: 60000      // Batch timeout in milliseconds
});
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_HUBSPOT_TRACKING` | `true` | Enable/disable HubSpot integration |
| `ENABLE_FILE_LOGGING` | `true` | Enable/disable file-based logging |
| `QUERY_BATCH_SIZE` | `10` | Number of queries to batch before sending |
| `QUERY_BATCH_TIMEOUT` | `60000` | Batch timeout in milliseconds |
| `HUBSPOT_ACCESS_TOKEN` | - | HubSpot API access token |
| `HUBSPOT_PORTAL_ID` | - | HubSpot portal ID |
| `ANALYTICS_EMAIL_DOMAIN` | `yourdomain.com` | Domain for analytics email |
| `ANALYTICS_USERNAME` | `admin` | Username for dashboard access |
| `ANALYTICS_PASSWORD` | `analytics2024!` | Password for dashboard access |
| `ANALYTICS_SESSION_TIMEOUT` | `14400000` | Session timeout in milliseconds (4 hours) |

## Dashboard Features

### Real-time Monitoring

- **System Status**: Shows if tracking is enabled and working
- **Real-time Stats**: Live query counts and performance metrics
- **HubSpot Status**: Integration health and connection status
- **Queue Monitoring**: Current batch queue size

### Analytics Views

- **Overview**: 30-day summary with key metrics
- **Top Keywords**: Most searched terms with frequency
- **LIA Cases**: Breakdown of legal case types
- **Recent Queries**: Latest user queries with timestamps

### Export Options

- **CSV Export**: Download query data for analysis
- **Multiple Timeframes**: 7, 30, or 90 days
- **Serverless Support**: Direct download in serverless environments

## Troubleshooting

### Common Issues

#### HubSpot Connection Fails

1. **Check API Key**: Verify `HUBSPOT_ACCESS_TOKEN` is correct
2. **Check Portal ID**: Verify `HUBSPOT_PORTAL_ID` is correct
3. **Test Connection**: Use `/api/analytics/hubspot-status` endpoint
4. **Check Permissions**: Ensure API key has proper permissions

#### No Data in Dashboard

1. **Check File Logging**: Verify `ENABLE_FILE_LOGGING=true`
2. **Check Serverless**: In serverless environments, data may be in memory only
3. **Check Logs**: Look for error messages in server logs
4. **Test Tracking**: Use `/api/analytics/track` to manually test

#### Performance Issues

1. **Reduce Batch Size**: Lower `QUERY_BATCH_SIZE` if needed
2. **Increase Timeout**: Increase `QUERY_BATCH_TIMEOUT` for slower networks
3. **Check Memory**: Monitor memory usage in high-traffic scenarios
4. **Enable Caching**: Analytics are cached for 5 minutes by default

### Debug Mode

Enable debug logging by setting:

```bash
DEBUG=query-tracker:*
```

### Log Files

In traditional environments, log files are stored in:
```
logs/queries-YYYY-MM-DD.json
```

## Security Considerations

### Authentication Security

- **Change Default Credentials**: Always change the default username and password
- **Strong Passwords**: Use strong, unique passwords for dashboard access
- **Session Management**: Sessions automatically expire after 4 hours
- **HTTPS**: Use HTTPS in production to encrypt authentication data
- **Rate Limiting**: Consider implementing rate limiting on authentication endpoints

### Data Privacy

- **IP Addresses**: Consider if you need to log IP addresses
- **User Agents**: May contain sensitive browser information
- **Session Data**: Ensure session IDs don't contain sensitive data

### API Security

- **Rate Limiting**: Consider implementing rate limits on analytics endpoints
- **Authentication**: Add authentication for dashboard access in production
- **CORS**: Configure CORS properly for your domain

### HubSpot Security

- **API Key Rotation**: Regularly rotate HubSpot API keys
- **Access Control**: Limit API key permissions to necessary scopes
- **Data Retention**: Consider HubSpot data retention policies

## Performance Optimization

### Batch Processing

- **Optimal Batch Size**: 10-20 queries per batch
- **Timeout Settings**: 30-60 seconds for batch timeout
- **Memory Management**: Monitor queue size in high-traffic scenarios

### Caching

- **Analytics Cache**: 5-minute cache for analytics data
- **HubSpot Cache**: Consider caching HubSpot data to reduce API calls
- **File System**: Use SSD storage for better file I/O performance

### Monitoring

- **Queue Size**: Monitor `currentQueueSize` in dashboard
- **Response Times**: Track average response times
- **Error Rates**: Monitor failed tracking attempts
- **HubSpot API**: Monitor HubSpot API response times

## Integration Examples

### Custom Analytics

```javascript
// Get analytics data programmatically
const analytics = await queryTracker.getAnalytics(30);
console.log('Total queries:', analytics.totalQueries);
console.log('Top keywords:', analytics.topKeywords);
```

### Custom Tracking

```javascript
// Track custom events
await queryTracker.trackQuery({
  query: "Custom event",
  source: "custom_integration",
  metadata: {
    userId: "user123",
    eventType: "page_view",
    customField: "value"
  }
});
```

### Webhook Integration

```javascript
// Send data to external services
app.post('/webhook/query-data', async (req, res) => {
  const queryData = req.body;
  await queryTracker.trackQuery(queryData);
  res.json({ success: true });
});
```

## Migration from Old System

If you're migrating from the old query tracking system:

1. **Backup Old Data**: Export existing query logs
2. **Update Environment**: Add new environment variables
3. **Test Integration**: Verify HubSpot connection
4. **Monitor Performance**: Check for any performance issues
5. **Update Documentation**: Update any existing documentation

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review server logs for error messages
3. Test individual endpoints for specific issues
4. Verify environment variable configuration
5. Check HubSpot API documentation for integration issues

## Future Enhancements

Planned features for future versions:

- **Advanced Analytics**: Trend analysis and predictions
- **User Segmentation**: Track user behavior patterns
- **A/B Testing**: Track different response variations
- **Real-time Alerts**: Notifications for unusual activity
- **Advanced Export**: More export formats and filtering options
- **Dashboard Customization**: Customizable dashboard layouts 