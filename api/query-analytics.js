/**
 * Query Analytics API Endpoints
 * 
 * Provides endpoints for:
 * - Query tracking and analytics
 * - Real-time statistics
 * - Data export
 * - HubSpot integration status
 */

import express from 'express';
import { QueryTracker } from '../utils/query-tracker.js';
import { HubSpotInjuryInfoConnector } from '../hubspot-connector.js';
import { AuthMiddleware } from '../utils/auth-middleware.js';

const router = express.Router();

// Initialize Query Tracker with HubSpot integration
const hubspotConnector = new HubSpotInjuryInfoConnector();
const queryTracker = new QueryTracker({
    hubspotConnector,
    enableHubSpotTracking: process.env.ENABLE_HUBSPOT_TRACKING !== 'false',
    enableFileLogging: process.env.ENABLE_FILE_LOGGING !== 'false',
    batchSize: parseInt(process.env.QUERY_BATCH_SIZE) || 10,
    batchTimeout: parseInt(process.env.QUERY_BATCH_TIMEOUT) || 60000
});

// Initialize Authentication Middleware
const authMiddleware = new AuthMiddleware({
    credentials: {
        username: process.env.ANALYTICS_USERNAME || 'admin',
        password: process.env.ANALYTICS_PASSWORD || 'analytics2024!'
    },
    sessionTimeout: parseInt(process.env.ANALYTICS_SESSION_TIMEOUT) || 4 * 60 * 60 * 1000
});

/**
 * POST /api/analytics/login
 * Authenticate user and get session token
 */
router.post('/login', authMiddleware.handleLogin());

/**
 * POST /api/analytics/logout
 * Logout and invalidate session
 */
router.post('/logout', authMiddleware.handleLogout());

/**
 * GET /api/analytics/session
 * Get current session information
 */
router.get('/session', authMiddleware.handleSessionInfo());

/**
 * GET /api/analytics/status
 * Get query tracker status and configuration
 */
router.get('/status', authMiddleware.requireAuth(), async (req, res) => {
    try {
        const status = queryTracker.getStatus();
        
        res.json({
            success: true,
            status,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error getting analytics status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get analytics status',
            details: error.message
        });
    }
});

/**
 * GET /api/analytics/realtime
 * Get real-time query statistics
 */
router.get('/realtime', authMiddleware.requireAuth(), async (req, res) => {
    try {
        const stats = await queryTracker.getRealTimeStats();
        
        res.json({
            success: true,
            stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error getting real-time stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get real-time statistics',
            details: error.message
        });
    }
});

/**
 * GET /api/analytics/summary
 * Get comprehensive analytics summary
 */
router.get('/summary', authMiddleware.requireAuth(), async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const forceRefresh = req.query.refresh === 'true';
        
        const analytics = await queryTracker.getAnalytics(days, forceRefresh);
        
        res.json({
            success: true,
            analytics,
            days,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error getting analytics summary:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get analytics summary',
            details: error.message
        });
    }
});

/**
 * GET /api/analytics/keywords
 * Get top keywords and their frequencies
 */
router.get('/keywords', authMiddleware.requireAuth(), async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const limit = parseInt(req.query.limit) || 20;
        
        const analytics = await queryTracker.getAnalytics(days);
        
        res.json({
            success: true,
            keywords: analytics.topKeywords.slice(0, limit),
            totalKeywords: analytics.topKeywords.length,
            days,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error getting keyword analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get keyword analytics',
            details: error.message
        });
    }
});

/**
 * GET /api/analytics/lia-cases
 * Get LIA case statistics
 */
router.get('/lia-cases', authMiddleware.requireAuth(), async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        
        const analytics = await queryTracker.getAnalytics(days);
        
        res.json({
            success: true,
            liaCaseStats: analytics.liaCaseStats,
            totalLiaCases: Object.values(analytics.liaCaseStats).reduce((sum, count) => sum + count, 0),
            days,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error getting LIA case analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get LIA case analytics',
            details: error.message
        });
    }
});

/**
 * GET /api/analytics/recent-queries
 * Get recent queries
 */
router.get('/recent-queries', authMiddleware.requireAuth(), async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const limit = parseInt(req.query.limit) || 50;
        
        const analytics = await queryTracker.getAnalytics(days);
        
        res.json({
            success: true,
            recentQueries: analytics.recentQueries.slice(0, limit),
            totalQueries: analytics.recentQueries.length,
            days,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error getting recent queries:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get recent queries',
            details: error.message
        });
    }
});

/**
 * GET /api/analytics/export/csv
 * Export query data to CSV
 */
router.get('/export/csv', authMiddleware.requireAuth(), async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        
        const result = await queryTracker.exportToCSV(days);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to export CSV',
                details: result.error
            });
        }
        
        // In serverless environments, return the CSV data directly
        if (result.serverless) {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="query-analytics-${new Date().toISOString().split('T')[0]}.csv"`);
            res.send(result.csvData);
        } else {
            // In traditional environments, return the file path
            res.json({
                success: true,
                file: result.file,
                message: 'CSV exported successfully',
                timestamp: new Date().toISOString()
            });
        }
        
    } catch (error) {
        console.error('❌ Error exporting CSV:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export CSV',
            details: error.message
        });
    }
});

/**
 * POST /api/analytics/track
 * Manually track a query (for testing or external integrations)
 */
router.post('/track', authMiddleware.requireAuth(), async (req, res) => {
    try {
        const { query, source = 'api', metadata = {} } = req.body;
        
        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Query is required'
            });
        }
        
        const trackingData = {
            query,
            source,
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip || req.connection.remoteAddress,
            sessionId: req.session?.id || 'api_call',
            pageUrl: req.get('Referer') || '',
            referrer: req.get('Referer') || '',
            ...metadata
        };
        
        const result = await queryTracker.trackQuery(trackingData);
        
        res.json({
            success: result.success,
            queryId: result.queryId,
            message: result.success ? 'Query tracked successfully' : 'Failed to track query',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error tracking query:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to track query',
            details: error.message
        });
    }
});

/**
 * POST /api/analytics/cleanup
 * Clean up old data and process pending batches
 */
router.post('/cleanup', authMiddleware.requireAuth(), async (req, res) => {
    try {
        const result = await queryTracker.cleanup();
        
        res.json({
            success: result.success,
            message: result.success ? 'Cleanup completed successfully' : 'Cleanup failed',
            details: result,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to perform cleanup',
            details: error.message
        });
    }
});

/**
 * GET /api/analytics/hubspot-status
 * Check HubSpot integration status
 */
router.get('/hubspot-status', authMiddleware.requireAuth(), async (req, res) => {
    try {
        const status = {
            enabled: queryTracker.enableHubSpotTracking && queryTracker.hubspotConnector,
            connectorAvailable: !!queryTracker.hubspotConnector,
            apiKeyConfigured: !!process.env.HUBSPOT_ACCESS_TOKEN,
            portalIdConfigured: !!process.env.HUBSPOT_PORTAL_ID,
            environment: process.env.NODE_ENV || 'development'
        };
        
        // Test HubSpot connection if configured
        if (status.enabled && status.apiKeyConfigured) {
            try {
                // Simple test to check if HubSpot API is accessible
                const testResult = await hubspotConnector.logKeywordQuery('test_connection', 'health_check');
                status.connectionTest = testResult ? 'success' : 'failed';
            } catch (error) {
                status.connectionTest = 'failed';
                status.connectionError = error.message;
            }
        }
        
        res.json({
            success: true,
            status,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error checking HubSpot status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check HubSpot status',
            details: error.message
        });
    }
});

/**
 * GET /api/analytics/dashboard
 * Get comprehensive dashboard data
 */
router.get('/dashboard', authMiddleware.requireAuth(), async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        
        // Get all analytics data
        const [analytics, realtimeStats, status] = await Promise.all([
            queryTracker.getAnalytics(days),
            queryTracker.getRealTimeStats(),
            Promise.resolve(queryTracker.getStatus())
        ]);
        
        // Calculate additional metrics
        const totalQueries = analytics.totalQueries;
        const uniqueKeywords = analytics.topKeywords.length;
        const liaCaseCount = Object.values(analytics.liaCaseStats).reduce((sum, count) => sum + count, 0);
        
        // Calculate trends (simplified - you could add more sophisticated trend analysis)
        const recentQueries = analytics.recentQueries.slice(0, 10);
        const avgQueriesPerDay = totalQueries / days;
        
        const dashboard = {
            overview: {
                totalQueries,
                uniqueKeywords,
                liaCaseCount,
                avgQueriesPerDay: Math.round(avgQueriesPerDay * 100) / 100,
                days
            },
            realtime: realtimeStats,
            topKeywords: analytics.topKeywords.slice(0, 10),
            liaCaseStats: analytics.liaCaseStats,
            recentQueries,
            status,
            timestamp: new Date().toISOString()
        };
        
        res.json({
            success: true,
            dashboard
        });
        
    } catch (error) {
        console.error('❌ Error getting dashboard data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get dashboard data',
            details: error.message
        });
    }
});

export default router; 