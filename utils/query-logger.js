/**
 * Query Logger - File-based logging for user queries and analytics
 * Stores data in JSON files for easy analysis and export
 * Disabled in serverless environments where file system is read-only
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class QueryLogger {
    constructor() {
        this.logsDir = path.join(__dirname, '..', 'logs');
        this.isServerless = this.detectServerlessEnvironment();
        
        if (!this.isServerless) {
            this.ensureLogsDirectory();
        }
    }

    /**
     * Detect if running in a serverless environment
     */
    detectServerlessEnvironment() {
        // Check for Vercel environment
        if (process.env.VERCEL || process.env.VERCEL_ENV) {
            return true;
        }
        
        // Check for AWS Lambda
        if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
            return true;
        }
        
        // Check for other serverless platforms
        if (process.env.FUNCTIONS_WORKER_RUNTIME || process.env.K_SERVICE) {
            return true;
        }
        
        return false;
    }

    /**
     * Ensure the logs directory exists
     */
    async ensureLogsDirectory() {
        if (this.isServerless) {
            console.log('📝 File logging disabled in serverless environment');
            return;
        }
        
        try {
            await fs.access(this.logsDir);
        } catch (error) {
            await fs.mkdir(this.logsDir, { recursive: true });
            console.log(`📁 Created logs directory: ${this.logsDir}`);
        }
    }

    /**
     * Get the filename for today's log
     */
    getTodayLogFile() {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        return path.join(this.logsDir, `queries-${today}.json`);
    }

    /**
     * Log a conversion event
     */
    async logConversion(conversionData) {
        if (this.isServerless) {
            console.log('📝 Conversion logging skipped in serverless environment');
            return { success: true, serverless: true };
        }

        try {
            const today = new Date().toISOString().split('T')[0];
            const conversionFile = path.join(this.logsDir, `conversions-${today}.json`);
            
            let conversions = [];
            
            try {
                const existingData = await fs.readFile(conversionFile, 'utf8');
                conversions = JSON.parse(existingData);
            } catch (error) {
                // File doesn't exist yet, start with empty array
                conversions = [];
            }
            
            conversions.push(conversionData);
            
            await fs.writeFile(conversionFile, JSON.stringify(conversions, null, 2));
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Error logging conversion:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Log a user query
     */
    async logQuery(queryData) {
        try {
            if (this.isServerless) {
                // In serverless environment, log to console and optionally to external service
                console.log(`📊 Query logged (serverless): "${queryData.query}" with ${queryData.keywords?.length || 0} keywords`);
                
                // Optional: Send to external logging service if configured
                if (process.env.EXTERNAL_LOGGING_URL) {
                    try {
                        await this.sendToExternalLogger(queryData);
                    } catch (externalError) {
                        console.warn('⚠️ Failed to send to external logger:', externalError.message);
                    }
                }
                
                return { success: true, serverless: true };
            }
            
            await this.ensureLogsDirectory();
            
            const logFile = this.getTodayLogFile();
            const timestamp = new Date().toISOString();
            
            // Prepare the log entry
            const logEntry = {
                timestamp,
                ...queryData
            };

            // Read existing logs or create new array
            let logs = [];
            try {
                const existingData = await fs.readFile(logFile, 'utf8');
                logs = JSON.parse(existingData);
            } catch (error) {
                // File doesn't exist or is empty, start with empty array
                logs = [];
            }

            // Add new log entry
            logs.push(logEntry);

            // Write back to file
            await fs.writeFile(logFile, JSON.stringify(logs, null, 2));
            
            console.log(`📊 Logged query: "${queryData.query}" with ${queryData.keywords?.length || 0} keywords`);
            
            return { success: true, logFile };
            
        } catch (error) {
            console.error('❌ Error logging query:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send log data to external logging service (for serverless environments)
     */
    async sendToExternalLogger(queryData) {
        if (!process.env.EXTERNAL_LOGGING_URL) {
            return;
        }
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            environment: 'serverless',
            ...queryData
        };
        
        const response = await fetch(process.env.EXTERNAL_LOGGING_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(process.env.EXTERNAL_LOGGING_API_KEY && {
                    'Authorization': `Bearer ${process.env.EXTERNAL_LOGGING_API_KEY}`
                })
            },
            body: JSON.stringify(logEntry)
        });
        
        if (!response.ok) {
            throw new Error(`External logging failed: ${response.status} ${response.statusText}`);
        }
    }

    /**
     * Get analytics for a date range
     */
    async getAnalytics(days = 30) {
        try {
            if (this.isServerless) {
                // In serverless environment, return empty analytics
                console.log('📊 Analytics requested in serverless environment - returning empty data');
                return {
                    totalQueries: 0,
                    topKeywords: [],
                    liaCaseStats: {},
                    recentQueries: [],
                    serverless: true
                };
            }
            
            await this.ensureLogsDirectory();
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            
            // Get all log files in the date range
            const files = await fs.readdir(this.logsDir);
            const logFiles = files
                .filter(file => file.startsWith('queries-') && file.endsWith('.json'))
                .sort()
                .reverse(); // Most recent first

            let allQueries = [];
            
            // Read data from each log file
            for (const file of logFiles) {
                try {
                    const filePath = path.join(this.logsDir, file);
                    const data = await fs.readFile(filePath, 'utf8');
                    const logs = JSON.parse(data);
                    
                    // Filter by date
                    const recentLogs = logs.filter(log => {
                        const logDate = new Date(log.timestamp);
                        return logDate >= cutoffDate;
                    });
                    
                    allQueries.push(...recentLogs);
                } catch (error) {
                    console.warn(`⚠️ Error reading log file ${file}:`, error.message);
                }
            }

            // Sort by timestamp (newest first)
            allQueries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            // Analyze the data
            return this.analyzeQueries(allQueries);
            
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
     * Analyze query data
     */
    analyzeQueries(queries) {
        if (queries.length === 0) {
            return {
                totalQueries: 0,
                topKeywords: [],
                liaCaseStats: {},
                recentQueries: []
            };
        }

        // Count keywords
        const keywordCounts = {};
        const liaCaseCounts = {};
        const recentQueries = [];

        queries.forEach(query => {
            // Count keywords
            if (query.keywords) {
                const keywords = Array.isArray(query.keywords) ? query.keywords : query.keywords.split(',').map(k => k.trim());
                keywords.forEach(keyword => {
                    if (keyword && keyword.length > 0) {
                        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
                    }
                });
            }

            // Count LIA cases
            if (query.liaCaseType) {
                liaCaseCounts[query.liaCaseType] = (liaCaseCounts[query.liaCaseType] || 0) + 1;
            }

            // Store recent queries
            recentQueries.push({
                query: query.query,
                timestamp: query.timestamp,
                liaCase: query.liaCaseType || null
            });
        });

        // Get top keywords
        const topKeywords = Object.entries(keywordCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 20)
            .map(([keyword, count]) => ({ keyword, count }));

        return {
            totalQueries: queries.length,
            topKeywords,
            liaCaseStats: liaCaseCounts,
            recentQueries: recentQueries.slice(0, 50) // Last 50 queries
        };
    }

    /**
     * Export data to CSV
     */
    async exportToCSV(days = 30) {
        try {
            if (this.isServerless) {
                console.log('📥 CSV export requested in serverless environment - not available');
                return { success: false, error: 'CSV export not available in serverless environment', serverless: true };
            }
            
            const analytics = await this.getAnalytics(days);
            
            let csv = 'Query,Keywords,LIA Case,Timestamp\n';
            
            analytics.recentQueries.forEach(query => {
                const escapedQuery = `"${query.query.replace(/"/g, '""')}"`;
                const liaCase = query.liaCase || '';
                csv += `${escapedQuery},,${liaCase},${query.timestamp}\n`;
            });

            const filename = `query-analytics-${new Date().toISOString().split('T')[0]}.csv`;
            const exportPath = path.join(this.logsDir, filename);
            
            await fs.writeFile(exportPath, csv);
            
            console.log(`📥 Exported CSV: ${exportPath}`);
            return { success: true, file: exportPath };
            
        } catch (error) {
            console.error('❌ Error exporting CSV:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all available log files
     */
    async getLogFiles() {
        try {
            if (this.isServerless) {
                console.log('📁 Log files requested in serverless environment - returning empty list');
                return [];
            }
            
            await this.ensureLogsDirectory();
            const files = await fs.readdir(this.logsDir);
            return files
                .filter(file => file.startsWith('queries-') && file.endsWith('.json'))
                .sort()
                .reverse();
        } catch (error) {
            console.error('❌ Error getting log files:', error);
            return [];
        }
    }

    /**
     * Clean up old log files (keep last N days)
     */
    async cleanupOldLogs(keepDays = 90) {
        try {
            if (this.isServerless) {
                console.log('🧹 Log cleanup requested in serverless environment - not available');
                return { success: false, error: 'Log cleanup not available in serverless environment', serverless: true };
            }
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - keepDays);
            
            const files = await this.getLogFiles();
            let deletedCount = 0;
            
            for (const file of files) {
                try {
                    // Extract date from filename (queries-YYYY-MM-DD.json)
                    const dateMatch = file.match(/queries-(\d{4}-\d{2}-\d{2})\.json/);
                    if (dateMatch) {
                        const fileDate = new Date(dateMatch[1]);
                        if (fileDate < cutoffDate) {
                            const filePath = path.join(this.logsDir, file);
                            await fs.unlink(filePath);
                            deletedCount++;
                            console.log(`🗑️ Deleted old log file: ${file}`);
                        }
                    }
                } catch (error) {
                    console.warn(`⚠️ Error processing file ${file}:`, error.message);
                }
            }
            
            console.log(`🧹 Cleanup complete: deleted ${deletedCount} old log files`);
            return { success: true, deletedCount };
            
        } catch (error) {
            console.error('❌ Error cleaning up old logs:', error);
            return { success: false, error: error.message };
        }
    }
}

 