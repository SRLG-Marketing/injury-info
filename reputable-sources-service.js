/**
 * Reputable Sources Service
 * 
 * This service manages reputable sources from Google Sheets and provides
 * relevant, verified links for AI responses based on user queries.
 */

import { GoogleSheetsConnector } from './google-sheets-connector.js';

export class ReputableSourcesService {
    constructor(config = {}) {
        this.googleSheets = config.googleSheets || null;
        this.cache = new Map();
        this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
        
        // Performance optimizations for large datasets
        this.keywordIndex = new Map(); // Index for faster keyword lookups
        this.diseaseIndex = new Map(); // Index for disease-based lookups
        
        if (!this.googleSheets) {
            console.warn('⚠️ Google Sheets connector not provided to ReputableSourcesService');
        }
    }

    /**
     * Get all reputable sources from Google Sheets
     */
    async getAllReputableSources() {
        const cacheKey = 'all_reputable_sources';
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        if (!this.googleSheets) {
            console.log('⚠️ Google Sheets connector not available for reputable sources');
            return this.getFallbackSources();
        }

        try {
            console.log('📊 Fetching reputable sources from Google Sheets...');
            const { data, headers } = await this.googleSheets.readSheet('Reputable_Sources');
            
            if (!data || data.length === 0) {
                console.log('⚠️ No reputable sources found in Google Sheets, using fallback');
                return this.getFallbackSources();
            }

            // Filter active sources and validate
            const validSources = data
                .filter(source => this.isActiveSource(source))
                .map(source => this.mapSheetRowToSource(source))
                .filter(source => source !== null);

            // Build indexes for faster searching
            this.buildSearchIndexes(validSources);

            console.log(`✅ Fetched ${validSources.length} active reputable sources`);
            this.setCache(cacheKey, validSources);
            return validSources;

        } catch (error) {
            console.error('❌ Error fetching reputable sources:', error);
            console.log('📋 Using fallback reputable sources due to error');
            return this.getFallbackSources();
        }
    }

    /**
     * Find relevant sources for a user query
     */
    async findRelevantSources(query, limit = 3) {
        if (!query || typeof query !== 'string') {
            return [];
        }

        try {
            const allSources = await this.getAllReputableSources();
            const queryWords = this.extractQueryWords(query);
            
            // Early filtering for better performance with large datasets
            const preFilteredSources = this.preFilterSources(allSources, queryWords, query);
            
            // Score only the pre-filtered sources
            const scoredSources = preFilteredSources.map(source => ({
                ...source,
                score: this.calculateRelevanceScore(source, queryWords, query)
            }));

            // Sort by score (highest first) then by priority
            const relevantSources = scoredSources
                .sort((a, b) => {
                    // First sort by score (highest first)
                    if (b.score !== a.score) {
                        return b.score - a.score;
                    }
                    // Then sort by priority (lowest number first)
                    return a.priority - b.priority;
                })
                .slice(0, limit);

            console.log(`🔍 Found ${relevantSources.length} relevant sources for query: "${query}" (searched ${allSources.length} total sources)`);
            
            return relevantSources;

        } catch (error) {
            console.error('❌ Error finding relevant sources:', error);
            return [];
        }
    }

    /**
     * Pre-filter sources to improve performance with large datasets
     */
    preFilterSources(allSources, queryWords, originalQuery) {
        if (allSources.length <= 50) {
            // For smaller datasets, return all sources for scoring
            return allSources;
        }

        const queryLower = originalQuery.toLowerCase();
        const candidateSources = new Set();

        // Use indexes for faster lookups
        for (const word of queryWords) {
            // Check keyword index
            if (this.keywordIndex.has(word)) {
                this.keywordIndex.get(word).forEach(source => candidateSources.add(source));
            }

            // Check disease index
            if (this.diseaseIndex.has(word)) {
                this.diseaseIndex.get(word).forEach(source => candidateSources.add(source));
            }
        }

        // Check for disease/ailment matches in the original query
        for (const [disease, sources] of this.diseaseIndex.entries()) {
            if (queryLower.includes(disease) || disease.includes(queryLower)) {
                sources.forEach(source => candidateSources.add(source));
            }
        }

        // Convert Set back to array
        const preFiltered = Array.from(candidateSources);

        // If pre-filtering is too restrictive, fall back to all sources
        if (preFiltered.length < 5) {
            console.log(`⚠️ Pre-filtering too restrictive (${preFiltered.length} sources), using all sources`);
            return allSources;
        }

        console.log(`🔍 Pre-filtered ${allSources.length} sources down to ${preFiltered.length} candidates`);
        return preFiltered;
    }

    /**
     * Find sources for a specific disease/ailment
     */
    async findSourcesForDisease(disease, limit = 5) {
        if (!disease || typeof disease !== 'string') {
            return [];
        }

        try {
            const allSources = await this.getAllReputableSources();
            const diseaseLower = disease.toLowerCase();
            
            const relevantSources = allSources
                .filter(source => {
                    const sourceDisease = source.diseaseAilment.toLowerCase();
                    return sourceDisease.includes(diseaseLower) || diseaseLower.includes(sourceDisease);
                })
                .sort((a, b) => a.priority - b.priority) // Sort by priority
                .slice(0, limit);

            console.log(`🔍 Found ${relevantSources.length} sources for disease: "${disease}"`);
            
            return relevantSources;

        } catch (error) {
            console.error('❌ Error finding sources for disease:', error);
            return [];
        }
    }

    /**
     * Calculate relevance score for a source based on query
     */
    calculateRelevanceScore(source, queryWords, originalQuery) {
        let score = 0;
        const sourceKeywords = this.parseKeywords(source.keywords);
        const sourceTitle = source.sourceTitle.toLowerCase();
        const sourceDescription = source.description.toLowerCase();
        const originalQueryLower = originalQuery.toLowerCase();

        // Check for exact matches in keywords
        for (const queryWord of queryWords) {
            if (sourceKeywords.includes(queryWord)) {
                score += 10; // High score for keyword match
            }
        }

        // Check for matches in title
        for (const queryWord of queryWords) {
            if (sourceTitle.includes(queryWord)) {
                score += 5; // Medium score for title match
            }
        }

        // Check for matches in description
        for (const queryWord of queryWords) {
            if (sourceDescription.includes(queryWord)) {
                score += 3; // Lower score for description match
            }
        }

        // Bonus for exact phrase matches
        if (sourceKeywords.some(keyword => originalQueryLower.includes(keyword))) {
            score += 15; // High bonus for exact phrase match
        }

        // Bonus for disease/ailment match
        const sourceDisease = source.diseaseAilment.toLowerCase();
        if (originalQueryLower.includes(sourceDisease) || sourceDisease.includes(originalQueryLower)) {
            score += 20; // Very high bonus for disease match
        }

        return score;
    }

    /**
     * Extract meaningful words from a query
     */
    extractQueryWords(query) {
        if (!query || typeof query !== 'string') {
            return [];
        }

        // Remove common stop words and extract meaningful terms
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
            'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
            'what', 'when', 'where', 'why', 'how', 'who', 'which', 'whose', 'whom'
        ]);

        return query
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ') // Remove punctuation
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word))
            .filter(word => !/^\d+$/.test(word)); // Remove pure numbers
    }

    /**
     * Parse comma-separated keywords
     */
    parseKeywords(keywordsString) {
        if (!keywordsString || typeof keywordsString !== 'string') {
            return [];
        }

        return keywordsString
            .split(',')
            .map(keyword => keyword.trim().toLowerCase())
            .filter(keyword => keyword.length > 0);
    }

    /**
     * Check if a source is active
     */
    isActiveSource(source) {
        const activeValue = source.Active || source.active || 'TRUE';
        return activeValue.toString().toUpperCase() === 'TRUE';
    }

    /**
     * Map Google Sheets row to source object
     */
    mapSheetRowToSource(row) {
        try {
            // Validate required fields
            if (!row.Disease_Ailment || !row.Source_Title || !row.Source_URL) {
                console.warn('⚠️ Skipping source with missing required fields:', row);
                return null;
            }

            return {
                id: `source_${row.ID || Math.random()}`,
                diseaseAilment: row.Disease_Ailment,
                sourceTitle: row.Source_Title,
                sourceUrl: row.Source_URL,
                sourceType: row.Source_Type || 'Medical',
                priority: parseInt(row.Priority) || 3,
                keywords: row.Keywords || '',
                description: row.Description || '',
                lastUpdated: row.Last_Updated || '',
                active: this.isActiveSource(row),
                source: 'google_sheets'
            };
        } catch (error) {
            console.error('❌ Error mapping source row:', error);
            return null;
        }
    }

    /**
     * Format sources for AI response
     */
    formatSourcesForResponse(sources) {
        if (!sources || sources.length === 0) {
            return '';
        }

        const formattedSources = sources.map(source => {
            const typeLabel = this.getSourceTypeLabel(source.sourceType);
            return `• **${source.sourceTitle}** (${typeLabel}) - [Read More](${source.sourceUrl})`;
        });

        return `\n\n**Reputable Sources:**\n${formattedSources.join('\n')}`;
    }

    /**
     * Get user-friendly label for source type
     */
    getSourceTypeLabel(sourceType) {
        const labels = {
            'Medical': 'Medical Authority',
            'Government': 'Government Source',
            'Research': 'Research Study',
            'Legal': 'Legal Database',
            'News': 'News Source'
        };
        return labels[sourceType] || sourceType;
    }

    /**
     * Get fallback sources when Google Sheets is unavailable
     */
    getFallbackSources() {
        return [];
    }

    /**
     * Build search indexes for faster lookups
     */
    buildSearchIndexes(sources) {
        this.keywordIndex.clear();
        this.diseaseIndex.clear();

        for (const source of sources) {
            // Index by disease/ailment
            const diseaseKey = source.diseaseAilment.toLowerCase();
            if (!this.diseaseIndex.has(diseaseKey)) {
                this.diseaseIndex.set(diseaseKey, []);
            }
            this.diseaseIndex.get(diseaseKey).push(source);

            // Index by keywords
            const keywords = this.parseKeywords(source.keywords);
            for (const keyword of keywords) {
                if (!this.keywordIndex.has(keyword)) {
                    this.keywordIndex.set(keyword, []);
                }
                this.keywordIndex.get(keyword).push(source);
            }
        }

        console.log(`📊 Built search indexes: ${this.diseaseIndex.size} diseases, ${this.keywordIndex.size} keywords`);
    }

    /**
     * Cache management
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    clearCache() {
        this.cache.clear();
    }

    /**
     * Validate a source entry
     */
    validateSource(source) {
        const errors = [];
        
        if (!source.diseaseAilment) errors.push('Disease_Ailment is required');
        if (!source.sourceTitle) errors.push('Source_Title is required');
        if (!source.sourceUrl) errors.push('Source_URL is required');
        if (!source.sourceType) errors.push('Source_Type is required');
        if (!source.priority) errors.push('Priority is required');
        if (!source.keywords) errors.push('Keywords is required');
        
        // Validate URL format
        if (source.sourceUrl && !this.isValidUrl(source.sourceUrl)) {
            errors.push('Source_URL must be a valid URL');
        }
        
        // Validate priority (1-5)
        if (source.priority && (source.priority < 1 || source.priority > 5)) {
            errors.push('Priority must be between 1 and 5');
        }
        
        return errors;
    }

    /**
     * Check if URL is valid
     */
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
} 