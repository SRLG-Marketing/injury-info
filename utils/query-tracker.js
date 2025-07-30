/**
 * Enhanced Query Tracker
 * 
 * Comprehensive query tracking system that:
 * - Logs all queries with detailed metadata
 * - Sends data to HubSpot for CRM integration
 * - Provides analytics and insights
 * - Works in both serverless and traditional environments
 */

import { QueryLogger } from './query-logger.js';

export class QueryTracker {
    constructor(config = {}) {
        this.queryLogger = new QueryLogger();
        this.hubspotConnector = config.hubspotConnector || null;
        this.enableHubSpotTracking = config.enableHubSpotTracking !== false;
        this.enableFileLogging = config.enableFileLogging !== false;
        this.batchSize = config.batchSize || 10;
        this.batchTimeout = config.batchTimeout || 60000; // 1 minute
        
        // In-memory queue for batching
        this.queryQueue = [];
        this.batchTimer = null;
        
        // Analytics cache
        this.analyticsCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        
        // Query Tracker initialized silently
    }

    /**
     * Track a user query with comprehensive metadata
     */
    async trackQuery(queryData) {
        try {
            const enrichedData = this.enrichQueryData(queryData);
            
            // Add to batch queue
            this.queryQueue.push(enrichedData);
            
            // Log immediately if file logging is enabled
            if (this.enableFileLogging) {
                await this.queryLogger.logQuery(enrichedData);
            }
            
            // Process batch if queue is full
            if (this.queryQueue.length >= this.batchSize) {
                await this.processBatch();
            } else {
                // Set timer for batch processing
                this.scheduleBatchProcessing();
            }
            
            return { success: true, queryId: enrichedData.queryId };
            
        } catch (error) {
            console.error('❌ Error tracking query:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Enrich query data with additional metadata
     */
    enrichQueryData(queryData) {
        const timestamp = new Date().toISOString();
        const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        return {
            queryId,
            timestamp,
            query: queryData.query || '',
            keywords: this.extractKeywords(queryData.query || ''),
            liaCaseType: queryData.liaCaseType || null,
            liaCaseInfo: queryData.liaCaseInfo || null,
            userAgent: queryData.userAgent || '',
            ipAddress: queryData.ipAddress || '',
            sessionId: queryData.sessionId || '',
            pageUrl: queryData.pageUrl || '',
            referrer: queryData.referrer || '',
            responseTime: queryData.responseTime || null,
            sourcesFound: queryData.sourcesFound || 0,
            articlesFound: queryData.articlesFound || 0,
            lawFirmsFound: queryData.lawFirmsFound || 0,
            settlementsFound: queryData.settlementsFound || 0,
            isLegalQuery: queryData.isLegalQuery || false,
            userLocation: queryData.userLocation || null,
            deviceType: this.detectDeviceType(queryData.userAgent || ''),
            browser: this.detectBrowser(queryData.userAgent || ''),
            os: this.detectOS(queryData.userAgent || ''),
            source: queryData.source || 'chatbot',
            environment: process.env.NODE_ENV || 'development',
            version: process.env.APP_VERSION || '1.0.0',
            // Legal Injury Advocates conversion tracking
            liaConversion: queryData.liaConversion || null,
            liaPageVisited: queryData.liaPageVisited || null,
            liaReferralGenerated: queryData.liaReferralGenerated || false,
            conversionTimestamp: queryData.conversionTimestamp || null
        };
    }

    /**
     * Extract keywords from query
     */
    extractKeywords(query) {
        if (!query || typeof query !== 'string') {
            return [];
        }

        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
            'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
            'what', 'when', 'where', 'why', 'how', 'who', 'which', 'whose', 'whom',
            'my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours', 'his', 'hers', 'ours', 'theirs'
        ]);

        return query
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word))
            .filter(word => !/^\d+$/.test(word))
            .slice(0, 10); // Limit to 10 keywords
    }

    /**
     * Detect device type from user agent
     */
    detectDeviceType(userAgent) {
        if (!userAgent) return 'unknown';
        
        const ua = userAgent.toLowerCase();
        if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
            return 'mobile';
        } else if (ua.includes('tablet') || ua.includes('ipad')) {
            return 'tablet';
        } else {
            return 'desktop';
        }
    }

    /**
     * Detect browser from user agent
     */
    detectBrowser(userAgent) {
        if (!userAgent) return 'unknown';
        
        const ua = userAgent.toLowerCase();
        if (ua.includes('chrome')) return 'chrome';
        if (ua.includes('firefox')) return 'firefox';
        if (ua.includes('safari')) return 'safari';
        if (ua.includes('edge')) return 'edge';
        if (ua.includes('opera')) return 'opera';
        return 'unknown';
    }

    /**
     * Detect OS from user agent
     */
    detectOS(userAgent) {
        if (!userAgent) return 'unknown';
        
        const ua = userAgent.toLowerCase();
        if (ua.includes('windows')) return 'windows';
        if (ua.includes('mac os')) return 'macos';
        if (ua.includes('linux')) return 'linux';
        if (ua.includes('android')) return 'android';
        if (ua.includes('ios')) return 'ios';
        return 'unknown';
    }

    /**
     * Schedule batch processing
     */
    scheduleBatchProcessing() {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }
        
        this.batchTimer = setTimeout(() => {
            this.processBatch();
        }, this.batchTimeout);
    }

    /**
     * Process batch of queries
     */
    async processBatch() {
        if (this.queryQueue.length === 0) {
            return;
        }

        const batch = [...this.queryQueue];
        this.queryQueue = [];
        
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }

        try {
            // Send to HubSpot if enabled
            if (this.enableHubSpotTracking && this.hubspotConnector) {
                await this.sendBatchToHubSpot(batch);
            }

            // Clear analytics cache since we have new data
            this.analyticsCache.clear();
            
        } catch (error) {
            console.error('❌ Error processing batch:', error);
            
            // Re-add queries to queue for retry (with limit to prevent infinite loops)
            if (batch.length < 100) {
                this.queryQueue.unshift(...batch);
            }
        }
    }

    /**
     * Send batch of queries to HubSpot
     */
    async sendBatchToHubSpot(batch) {
        try {
            // Create summary for HubSpot
            const summary = this.createBatchSummary(batch);
            
            // Send to HubSpot using existing connector
            if (this.hubspotConnector.logKeywordQuery) {
                await this.hubspotConnector.logKeywordQuery(
                    `Batch: ${batch.length} queries - ${summary.topKeywords.join(', ')}`,
                    'batch_tracker'
                );
            }

            // Also send individual queries for detailed tracking
            for (const queryData of batch.slice(0, 5)) { // Limit to 5 to avoid rate limits
                try {
                    await this.hubspotConnector.logKeywordQuery(
                        queryData.query,
                        'individual_tracker'
                    );
                } catch (error) {
                    console.warn(`⚠️ Failed to log individual query to HubSpot:`, error.message);
                }
            }

        } catch (error) {
            console.error('❌ Error sending batch to HubSpot:', error);
            throw error;
        }
    }

    /**
     * Create summary of batch data
     */
    createBatchSummary(batch) {
        const keywordCounts = {};
        const liaCaseCounts = {};
        const deviceCounts = {};
        const browserCounts = {};

        batch.forEach(query => {
            // Count keywords
            if (query.keywords) {
                query.keywords.forEach(keyword => {
                    keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
                });
            }

            // Count LIA cases
            if (query.liaCaseType) {
                liaCaseCounts[query.liaCaseType] = (liaCaseCounts[query.liaCaseType] || 0) + 1;
            }

            // Count devices
            deviceCounts[query.deviceType] = (deviceCounts[query.deviceType] || 0) + 1;
            browserCounts[query.browser] = (browserCounts[query.browser] || 0) + 1;
        });

        const topKeywords = Object.entries(keywordCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([keyword]) => keyword);

        return {
            totalQueries: batch.length,
            topKeywords,
            liaCaseCounts,
            deviceCounts,
            browserCounts,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get comprehensive analytics
     */
    async getAnalytics(days = 30, forceRefresh = false) {
        const cacheKey = `analytics_${days}`;
        
        // Check cache first
        if (!forceRefresh) {
            const cached = this.analyticsCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            // Get file-based analytics
            const fileAnalytics = await this.queryLogger.getAnalytics(days);
            
            // Combine with in-memory data
            const combinedAnalytics = this.combineAnalytics(fileAnalytics, this.queryQueue);
            
            // Cache the result
            this.analyticsCache.set(cacheKey, {
                data: combinedAnalytics,
                timestamp: Date.now()
            });

            return combinedAnalytics;
            
        } catch (error) {
            console.error('❌ Error getting analytics:', error);
            return {
                totalQueries: 0,
                topKeywords: [],
                liaCaseStats: {},
                recentQueries: [],
                error: error.message
            };
        }
    }

    /**
     * Combine file analytics with in-memory data
     */
    combineAnalytics(fileAnalytics, inMemoryQueries) {
        if (inMemoryQueries.length === 0) {
            return fileAnalytics;
        }

        // Convert in-memory queries to the same format as file analytics
        const inMemoryData = inMemoryQueries.map(query => ({
            query: query.query,
            timestamp: query.timestamp,
            liaCase: query.liaCaseType || null,
            keywords: query.keywords || []
        }));

        // Combine keyword counts
        const combinedKeywords = {};
        
        // Add file analytics keywords
        fileAnalytics.topKeywords.forEach(({ keyword, count }) => {
            combinedKeywords[keyword] = count;
        });
        
        // Add in-memory keywords
        inMemoryData.forEach(query => {
            query.keywords.forEach(keyword => {
                combinedKeywords[keyword] = (combinedKeywords[keyword] || 0) + 1;
            });
        });

        // Combine LIA case stats
        const combinedLiaStats = { ...fileAnalytics.liaCaseStats };
        inMemoryData.forEach(query => {
            if (query.liaCase) {
                combinedLiaStats[query.liaCase] = (combinedLiaStats[query.liaCase] || 0) + 1;
            }
        });

        // Combine recent queries
        const combinedRecentQueries = [
            ...inMemoryData.map(query => ({
                query: query.query,
                timestamp: query.timestamp,
                liaCase: query.liaCase
            })),
            ...fileAnalytics.recentQueries
        ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 50);

        return {
            totalQueries: fileAnalytics.totalQueries + inMemoryQueries.length,
            topKeywords: Object.entries(combinedKeywords)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 20)
                .map(([keyword, count]) => ({ keyword, count })),
            liaCaseStats: combinedLiaStats,
            recentQueries: combinedRecentQueries,
            inMemoryCount: inMemoryQueries.length,
            fileCount: fileAnalytics.totalQueries
        };
    }

    /**
     * Track conversion when user visits Legal Injury Advocates page
     */
    async trackConversion(queryId, conversionData) {
        try {
            const conversionInfo = {
                queryId,
                conversionTimestamp: new Date().toISOString(),
                liaPageVisited: conversionData.pageUrl || '',
                liaConversion: conversionData.conversionType || 'page_visit',
                liaReferralGenerated: conversionData.referralGenerated || false,
                userAgent: conversionData.userAgent || '',
                sessionId: conversionData.sessionId || ''
            };

            // Log conversion to file if enabled
            if (this.enableFileLogging) {
                await this.queryLogger.logConversion(conversionInfo);
            }

            // Add to HubSpot if enabled
            if (this.enableHubSpotTracking && this.hubspotConnector) {
                try {
                    await this.hubspotConnector.logConversion(conversionInfo);
                } catch (error) {
                    console.warn('Could not log conversion to HubSpot:', error.message);
                }
            }

            return { success: true, conversionId: `conv_${Date.now()}` };

        } catch (error) {
            console.error('❌ Error tracking conversion:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get conversion statistics
     */
    async getConversionStats(days = 30) {
        try {
            const analytics = await this.getAnalytics(days);
            const queries = analytics.recentQueries || [];

            // Count conversions
            const conversions = queries.filter(q => q.liaConversion || q.liaPageVisited);
            const totalQueries = queries.length;
            const conversionRate = totalQueries > 0 ? (conversions.length / totalQueries * 100).toFixed(2) : 0;

            // Group by conversion type
            const conversionTypes = {};
            conversions.forEach(conversion => {
                const type = conversion.liaConversion || 'page_visit';
                conversionTypes[type] = (conversionTypes[type] || 0) + 1;
            });

            // Top converting queries
            const convertingQueries = conversions.map(c => ({
                query: c.query,
                timestamp: c.timestamp,
                liaPageVisited: c.liaPageVisited,
                conversionType: c.liaConversion
            })).slice(0, 20);

            return {
                totalConversions: conversions.length,
                totalQueries,
                conversionRate: parseFloat(conversionRate),
                conversionTypes,
                convertingQueries,
                days
            };

        } catch (error) {
            console.error('❌ Error getting conversion stats:', error);
            return {
                totalConversions: 0,
                totalQueries: 0,
                conversionRate: 0,
                conversionTypes: {},
                convertingQueries: [],
                error: error.message
            };
        }
    }

    /**
     * Get real-time query statistics
     */
    async getRealTimeStats() {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        try {
            // Get file-based queries from the last hour
            const fileAnalytics = await this.queryLogger.getAnalytics(1); // Last 1 day
            const fileQueries = fileAnalytics.recentQueries || [];
            
            // Filter file queries to last hour and last day
            const recentFileQueries = fileQueries.filter(query => 
                new Date(query.timestamp) >= oneHourAgo
            );
            
            const dailyFileQueries = fileQueries.filter(query => 
                new Date(query.timestamp) >= oneDayAgo
            );

            // Get in-memory queries
            const recentMemoryQueries = this.queryQueue.filter(query => 
                new Date(query.timestamp) >= oneHourAgo
            );

            const dailyMemoryQueries = this.queryQueue.filter(query => 
                new Date(query.timestamp) >= oneDayAgo
            );

            // Combine file and memory queries
            const allRecentQueries = [...recentMemoryQueries, ...recentFileQueries];
            const allDailyQueries = [...dailyMemoryQueries, ...dailyFileQueries];

            return {
                currentQueueSize: this.queryQueue.length,
                queriesLastHour: allRecentQueries.length,
                queriesLastDay: allDailyQueries.length,
                averageResponseTime: this.calculateAverageResponseTime(allRecentQueries),
                topKeywordsLastHour: this.getTopKeywords(allRecentQueries, 5),
                deviceBreakdown: this.getDeviceBreakdown(allRecentQueries),
                browserBreakdown: this.getBrowserBreakdown(allRecentQueries),
                memoryQueriesLastHour: recentMemoryQueries.length,
                fileQueriesLastHour: recentFileQueries.length,
                lastUpdated: now.toISOString()
            };
        } catch (error) {
            console.error('❌ Error getting real-time stats:', error);
            // Fallback to in-memory only if file reading fails
            const recentQueries = this.queryQueue.filter(query => 
                new Date(query.timestamp) >= oneHourAgo
            );

            const dailyQueries = this.queryQueue.filter(query => 
                new Date(query.timestamp) >= oneDayAgo
            );

            return {
                currentQueueSize: this.queryQueue.length,
                queriesLastHour: recentQueries.length,
                queriesLastDay: dailyQueries.length,
                averageResponseTime: this.calculateAverageResponseTime(recentQueries),
                topKeywordsLastHour: this.getTopKeywords(recentQueries, 5),
                deviceBreakdown: this.getDeviceBreakdown(recentQueries),
                browserBreakdown: this.getBrowserBreakdown(recentQueries),
                memoryQueriesLastHour: recentQueries.length,
                fileQueriesLastHour: 0,
                lastUpdated: now.toISOString(),
                error: 'File data unavailable, showing in-memory only'
            };
        }
    }

    /**
     * Calculate average response time
     */
    calculateAverageResponseTime(queries) {
        const queriesWithResponseTime = queries.filter(q => q.responseTime !== null);
        if (queriesWithResponseTime.length === 0) return null;
        
        const totalTime = queriesWithResponseTime.reduce((sum, q) => sum + q.responseTime, 0);
        return Math.round(totalTime / queriesWithResponseTime.length);
    }

    /**
     * Get top keywords from queries
     */
    getTopKeywords(queries, limit = 10) {
        const keywordCounts = {};
        
        queries.forEach(query => {
            if (query.keywords) {
                query.keywords.forEach(keyword => {
                    keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
                });
            }
        });

        return Object.entries(keywordCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([keyword, count]) => ({ keyword, count }));
    }

    /**
     * Get device breakdown
     */
    getDeviceBreakdown(queries) {
        const deviceCounts = {};
        
        queries.forEach(query => {
            deviceCounts[query.deviceType] = (deviceCounts[query.deviceType] || 0) + 1;
        });

        return deviceCounts;
    }

    /**
     * Get browser breakdown
     */
    getBrowserBreakdown(queries) {
        const browserCounts = {};
        
        queries.forEach(query => {
            browserCounts[query.browser] = (browserCounts[query.browser] || 0) + 1;
        });

        return browserCounts;
    }

    /**
     * Export query data to CSV
     */
    async exportToCSV(days = 30) {
        try {
            return await this.queryLogger.exportToCSV(days);
        } catch (error) {
            console.error('❌ Error exporting to CSV:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Clean up old data
     */
    async cleanup() {
        try {
            // Process any remaining queries in queue
            if (this.queryQueue.length > 0) {
                await this.processBatch();
            }

            // Clean up old log files
            if (this.enableFileLogging) {
                await this.queryLogger.cleanupOldLogs(90);
            }

            // Clear analytics cache
            this.analyticsCache.clear();

            console.log('🧹 Query tracker cleanup completed');
            return { success: true };
            
        } catch (error) {
            console.error('❌ Error during cleanup:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get configuration status
     */
    getStatus() {
        return {
            hubspotEnabled: this.enableHubSpotTracking && this.hubspotConnector,
            fileLoggingEnabled: this.enableFileLogging,
            currentQueueSize: this.queryQueue.length,
            batchSize: this.batchSize,
            batchTimeout: this.batchTimeout,
            cacheSize: this.analyticsCache.size,
            environment: process.env.NODE_ENV || 'development'
        };
    }
} 