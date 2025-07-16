/**
 * Data Verification Middleware
 * Prevents AI hallucination by verifying responses against actual data sources
 */

import { DataIntegrationService } from './data-integration-service.js';

export class DataVerificationMiddleware {
    constructor() {
        this.dataService = new DataIntegrationService();
        this.verificationKeywords = [
            'settlement', 'compensation', 'case', 'lawsuit', 'verdict',
            'symptoms', 'diagnosis', 'treatment', 'medical', 'condition',
            'law firm', 'attorney', 'legal', 'court', 'jury',
            'manufacturer', 'product', 'recall', 'injury', 'damages'
        ];
    }

    /**
     * Verify AI response against actual data sources
     */
    async verifyResponse(aiResponse, userQuery) {
        try {
            console.log('🔍 Verifying AI response against data sources...');
            
            // Extract claims from AI response
            const claims = this.extractClaims(aiResponse);
            
            if (claims.length === 0) {
                console.log('✅ No specific claims to verify');
                return { verified: true, response: aiResponse, warnings: [] };
            }

            const warnings = [];
            let verifiedResponse = aiResponse;

            // Verify each claim
            for (const claim of claims) {
                const verification = await this.verifyClaim(claim, userQuery);
                
                if (!verification.verified) {
                    warnings.push(verification.warning);
                    // Remove or modify unverified claims
                    verifiedResponse = this.removeUnverifiedClaim(verifiedResponse, claim);
                }
            }

            // Only add a professional note if there were significant verification issues
            if (warnings.length > 0) {
                console.log('⚠️ Verification warnings:', warnings);
                
                // Add a cleaner, more professional note
                const note = '\n\n*This information is provided for general educational purposes. For specific medical or legal advice, please consult with qualified professionals.*';
                
                // Only add the note if it's not already present
                if (!verifiedResponse.includes('consult with qualified professionals')) {
                    verifiedResponse += note;
                }
            }

            console.log('✅ Response verification complete');
            return {
                verified: warnings.length === 0,
                response: verifiedResponse,
                warnings,
                claimsVerified: claims.length
            };

        } catch (error) {
            console.error('❌ Error during response verification:', error);
            // Return original response with a professional note if verification fails
            return {
                verified: false,
                response: aiResponse + '\n\n*This information is provided for general educational purposes. For specific advice, please consult with qualified professionals.*',
                warnings: ['Verification system unavailable'],
                claimsVerified: 0
            };
        }
    }

    /**
     * Extract specific claims from AI response
     */
    extractClaims(response) {
        const claims = [];
        
        // Look for specific numbers, dates, case names, etc. - be more selective
        const patterns = [
            /\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g, // Dollar amounts (more specific)
            /\d{1,2}\/\d{1,2}\/\d{4}/g, // Dates
            /case\s+(?:of\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi, // Case names
            /settlement\s+(?:of\s+)?\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/gi, // Specific settlement amounts
            /(?:average|typical)\s+(?:settlement|compensation)\s+(?:of\s+)?\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/gi, // Specific average amounts
        ];

        patterns.forEach(pattern => {
            const matches = response.match(pattern);
            if (matches) {
                claims.push(...matches);
            }
        });

        // Extract article references - be more specific
        const articlePatterns = [
            /(?:read|check|see|visit)\s+(?:our\s+)?(?:article\s+)?(?:about\s+)?["']([^"']+)["']/gi,
            /(?:article|page|post)\s+(?:titled\s+)?["']([^"']+)["']/gi,
            /(?:we\s+have\s+an\s+article|there's\s+an\s+article)\s+(?:about\s+)?["']([^"']+)["']/gi
        ];

        articlePatterns.forEach(pattern => {
            const matches = response.match(pattern);
            if (matches) {
                // Extract the article title/content from the match
                const articleContent = matches.map(match => {
                    const titleMatch = match.match(/["']([^"']+)["']/);
                    return titleMatch ? titleMatch[1] : match;
                });
                claims.push(...articleContent);
            }
        });

        return [...new Set(claims)]; // Remove duplicates
    }

    /**
     * Verify a specific claim against data sources
     */
    async verifyClaim(claim, userQuery) {
        try {
            // Check if claim contains verification keywords
            const hasKeywords = this.verificationKeywords.some(keyword => 
                claim.toLowerCase().includes(keyword)
            );

            // Check if claim is an article reference
            const isArticleReference = this.isArticleReference(claim);

            if (!hasKeywords && !isArticleReference) {
                return { verified: true, warning: null };
            }

            // Search for related data
            const searchResults = await this.searchDataSources(claim, userQuery);
            
            if (searchResults.length === 0) {
                if (isArticleReference) {
                    return {
                        verified: false,
                        warning: `Article reference "${claim}" not found in our database`
                    };
                }
                return {
                    verified: false,
                    warning: `Claim "${claim}" not found in verified data sources`
                };
            }

            // Check if claim is supported by search results
            const isSupported = this.checkClaimSupport(claim, searchResults);
            
            return {
                verified: isSupported,
                warning: isSupported ? null : `Claim "${claim}" not fully supported by verified data`
            };

        } catch (error) {
            console.error('Error verifying claim:', error);
            return { verified: false, warning: 'Unable to verify claim due to system error' };
        }
    }

    /**
     * Check if a claim is an article reference
     */
    isArticleReference(claim) {
        const articleKeywords = [
            'article', 'page', 'post', 'read', 'check', 'see', 'visit',
            'titled', 'about', 'our article', 'we have', 'you can read'
        ];
        
        return articleKeywords.some(keyword => 
            claim.toLowerCase().includes(keyword)
        );
    }

    /**
     * Search data sources for relevant information
     */
    async searchDataSources(claim, userQuery) {
        const results = [];

        try {
            // Search articles
            const articles = await this.dataService.searchArticles(userQuery);
            results.push(...articles);

            // If this is an article reference, also search specifically for that article
            if (this.isArticleReference(claim)) {
                const specificArticles = await this.dataService.searchArticles(claim);
                results.push(...specificArticles);
            }

            // Search settlement data
            const settlements = await this.dataService.getSettlementData(userQuery);
            if (settlements && settlements.length > 0) {
                results.push(...settlements);
            }

            // Search law firms
            const lawFirms = await this.dataService.getLawFirms();
            if (lawFirms && lawFirms.length > 0) {
                results.push(...lawFirms.slice(0, 5)); // Limit to first 5
            }

        } catch (error) {
            console.error('Error searching data sources:', error);
        }

        return results;
    }

    /**
     * Verify if a specific article exists
     */
    async verifyArticleExists(articleTitle) {
        try {
            // Search for the specific article
            const articles = await this.dataService.searchArticles(articleTitle);
            
            // Check if any article matches the title closely
            const matchingArticle = articles.find(article => {
                const titleSimilarity = this.calculateSimilarity(
                    articleTitle.toLowerCase(), 
                    article.title.toLowerCase()
                );
                return titleSimilarity > 0.8; // 80% similarity threshold
            });

            return {
                exists: !!matchingArticle,
                article: matchingArticle || null,
                similarity: matchingArticle ? this.calculateSimilarity(
                    articleTitle.toLowerCase(), 
                    matchingArticle.title.toLowerCase()
                ) : 0
            };

        } catch (error) {
            console.error('Error verifying article:', error);
            return { exists: false, article: null, similarity: 0 };
        }
    }

    /**
     * Check if claim is supported by search results
     */
    checkClaimSupport(claim, searchResults) {
        const claimLower = claim.toLowerCase();
        
        return searchResults.some(result => {
            const resultText = JSON.stringify(result).toLowerCase();
            return resultText.includes(claimLower) || 
                   this.calculateSimilarity(claimLower, resultText) > 0.7;
        });
    }

    /**
     * Calculate similarity between claim and result
     */
    calculateSimilarity(claim, result) {
        const claimWords = claim.split(/\s+/);
        const resultWords = result.split(/\s+/);
        
        const commonWords = claimWords.filter(word => 
            resultWords.includes(word) && word.length > 3
        );
        
        return commonWords.length / Math.max(claimWords.length, resultWords.length);
    }

    /**
     * Remove unverified claim from response
     */
    removeUnverifiedClaim(response, claim) {
        // Check if it's an article reference
        if (this.isArticleReference(claim)) {
            // Remove article references entirely instead of adding clunky text
            return response.replace(
                new RegExp(claim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
                ''
            ).replace(/\s+/g, ' ').trim(); // Clean up extra spaces
        }
        
        // For specific claims, try to replace with more general language
        const claimLower = claim.toLowerCase();
        
        // Handle common patterns more elegantly
        if (claimLower.includes('settlement') || claimLower.includes('compensation')) {
            return response.replace(
                new RegExp(claim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
                'settlement amounts vary by case'
            );
        }
        
        if (claimLower.includes('symptoms') || claimLower.includes('diagnosis')) {
            return response.replace(
                new RegExp(claim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
                'symptoms and diagnosis vary by individual'
            );
        }
        
        if (claimLower.includes('treatment')) {
            return response.replace(
                new RegExp(claim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
                'treatment options should be discussed with medical professionals'
            );
        }
        
        // For other claims, remove them entirely rather than adding clunky text
        return response.replace(
            new RegExp(claim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
            ''
        ).replace(/\s+/g, ' ').trim(); // Clean up extra spaces
    }

    /**
     * Add data source citations to response
     */
    addCitations(response, searchResults) {
        if (searchResults.length === 0) return response;

        const citations = [];
        
        // Add source information
        const sources = [...new Set(searchResults.map(r => r.source))];
        if (sources.length > 0) {
            citations.push(`Sources: ${sources.join(', ')}`);
        }

        // Add data freshness
        const dates = searchResults
            .map(r => r.date || r.lastUpdated)
            .filter(d => d)
            .sort()
            .reverse();
        
        if (dates.length > 0) {
            citations.push(`Last updated: ${dates[0]}`);
        }

        if (citations.length > 0) {
            return response + '\n\n' + citations.join(' | ');
        }

        return response;
    }
} 