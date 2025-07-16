/**
 * Data Integration Service
 * Fetches data from Google Sheets and HubSpot through MCP connectors
 * Provides centralized data access for the injury info website
 */

import { HubSpotInjuryInfoConnector } from './hubspot-connector.js';
import { GoogleSheetsConnector } from './google-sheets-connector.js';

export class DataIntegrationService {
    constructor() {
        // Initialize connectors with error handling
        try {
            this.hubspot = new HubSpotInjuryInfoConnector({
                hubspotApiKey: process.env.HUBSPOT_ACCESS_TOKEN,
                hubspotPortalId: process.env.HUBSPOT_PORTAL_ID
            });
            console.log('✅ HubSpot connector initialized');
        } catch (error) {
            console.warn('⚠️ HubSpot connector failed to initialize:', error.message);
            this.hubspot = null;
        }
        
        try {
            this.googleSheets = new GoogleSheetsConnector({
                apiKey: process.env.GOOGLE_API_KEY,
                spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID
            });
            console.log('✅ Google Sheets connector initialized');
        } catch (error) {
            console.warn('⚠️ Google Sheets connector failed to initialize:', error.message);
            this.googleSheets = null;
        }

        // Cache for performance
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Get all articles from Google Sheets and HubSpot
     */
    async getAllArticles() {
        const cacheKey = 'all_articles';
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            console.log('🔄 Fetching articles from data sources...');
            
            const [sheetsArticles, hubspotArticles] = await Promise.all([
                this.getArticlesFromGoogleSheets(),
                this.getArticlesFromHubSpot()
            ]);

            // Merge and deduplicate articles
            const allArticles = this.mergeArticles(sheetsArticles, hubspotArticles);
            
            // If no articles found from connectors, use fallback data
            if (allArticles.length === 0) {
                console.log('📋 Using fallback article data');
                const fallbackArticles = this.getFallbackArticles();
                this.setCache(cacheKey, fallbackArticles);
                return fallbackArticles;
            }
            
            this.setCache(cacheKey, allArticles);
            console.log(`✅ Fetched ${allArticles.length} articles total`);
            
            return allArticles;
        } catch (error) {
            console.error('❌ Error fetching articles:', error);
            console.log('📋 Using fallback article data due to error');
            // Return fallback data if connectors fail
            return this.getFallbackArticles();
        }
    }

    /**
     * Get articles from Google Sheets
     */
    async getArticlesFromGoogleSheets() {
        if (!this.googleSheets) {
            console.log('⚠️ Google Sheets connector not available');
            return [];
        }
        
        try {
            const articles = [];
            
            // Read from different sheets - updated to match actual sheet names
            const sheets = ['Top_10_Cases', 'Case_Amounts'];
            
            for (const sheetName of sheets) {
                try {
                    const { data } = await this.googleSheets.readSheet(sheetName);
                    
                    for (const row of data) {
                        const article = this.mapSheetRowToArticle(row, sheetName);
                        if (article) {
                            articles.push(article);
                        }
                    }
                } catch (error) {
                    console.warn(`⚠️ Could not read sheet ${sheetName}:`, error.message);
                }
            }
            
            return articles;
        } catch (error) {
            console.error('❌ Error reading Google Sheets:', error);
            return [];
        }
    }

    /**
     * Get articles from HubSpot
     */
    async getArticlesFromHubSpot() {
        if (!this.hubspot) {
            console.log('⚠️ HubSpot connector not available');
            return [];
        }
        
        try {
            // Search for disease/condition content
            const diseases = await this.hubspot.searchDiseases('', null, 50);
            
            return diseases.map(disease => ({
                id: `hubspot_${disease.id}`,
                title: disease.name,
                description: disease.description,
                slug: this.createSlug(disease.name),
                category: disease.category || 'medical',
                date: disease.lastUpdated,
                content: {
                    overview: disease.description,
                    symptoms: disease.symptoms || [],
                    causes: disease.causes || [],
                    treatments: [], // Would need to be populated from content
                    legalOptions: [], // Would need to be populated from content
                    settlements: '' // Would need to be populated from content
                },
                source: 'hubspot'
            }));
        } catch (error) {
            console.error('❌ Error reading HubSpot:', error);
            return [];
        }
    }

    /**
     * Map Google Sheets row to article format
     */
    mapSheetRowToArticle(row, sheetName) {
        try {
            switch (sheetName) {
                case 'Top_10_Cases':
                    return {
                        id: `sheets_case_${row.ID || Math.random()}`,
                        title: row['Case Name'] || row.Name || row['Case Type'] || '',
                        description: row.Description || row['Case Summary'] || '',
                        slug: this.createSlug(row['Case Name'] || row.Name || row['Case Type'] || ''),
                        category: 'legal',
                        date: row['Date Filed'] || row['Last Updated'] || new Date().toISOString(),
                        content: {
                            overview: row.Description || row['Case Summary'] || '',
                            symptoms: this.parseList(row.Symptoms || ''),
                            causes: this.parseList(row['Alleged Causes'] || ''),
                            treatments: [],
                            legalOptions: this.parseList(row['Legal Options'] || ''),
                            settlements: row['Settlement Amount'] || row.Settlements || ''
                        },
                        source: 'google_sheets'
                    };

                case 'Case_Amounts':
                    return {
                        id: `sheets_settlement_${row.ID || Math.random()}`,
                        title: row['Case Type'] || row.Name || '',
                        description: row.Description || row['Case Summary'] || '',
                        slug: this.createSlug(row['Case Type'] || row.Name || ''),
                        category: 'settlement',
                        date: row['Date'] || row['Last Updated'] || new Date().toISOString(),
                        content: {
                            overview: row.Description || row['Case Summary'] || '',
                            symptoms: [],
                            causes: [],
                            treatments: [],
                            legalOptions: [],
                            settlements: row['Settlement Amount'] || row['Amount'] || row.Settlements || ''
                        },
                        source: 'google_sheets'
                    };

                default:
                    return null;
            }
        } catch (error) {
            console.error('❌ Error mapping sheet row:', error);
            return null;
        }
    }

    /**
     * Get law firms from Google Sheets and HubSpot
     */
    async getLawFirms(specialty = null, location = null) {
        const cacheKey = `law_firms_${specialty}_${location}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const [sheetsFirms, hubspotFirms] = await Promise.all([
                this.getLawFirmsFromGoogleSheets(specialty, location),
                this.getLawFirmsFromHubSpot(specialty, location)
            ]);

            const allFirms = [...sheetsFirms, ...hubspotFirms];
            
            // If no firms found from connectors, use fallback data
            if (allFirms.length === 0) {
                console.log('📋 Using fallback law firm data');
                const fallbackFirms = this.getFallbackLawFirms();
                // Filter by specialty if specified
                const filteredFirms = specialty 
                    ? fallbackFirms.filter(firm => 
                        firm.specialties.some(s => s.toLowerCase().includes(specialty.toLowerCase()))
                    )
                    : fallbackFirms;
                this.setCache(cacheKey, filteredFirms);
                return filteredFirms;
            }
            
            this.setCache(cacheKey, allFirms);
            return allFirms;
        } catch (error) {
            console.error('❌ Error fetching law firms:', error);
            console.log('📋 Using fallback law firm data due to error');
            const fallbackFirms = this.getFallbackLawFirms();
            const filteredFirms = specialty 
                ? fallbackFirms.filter(firm => 
                    firm.specialties.some(s => s.toLowerCase().includes(specialty.toLowerCase()))
                )
                : fallbackFirms;
            return filteredFirms;
        }
    }

    /**
     * Get law firms from Google Sheets
     */
    async getLawFirmsFromGoogleSheets(specialty = null, location = null) {
        if (!this.googleSheets) {
            console.log('⚠️ Google Sheets connector not available');
            return [];
        }
        
        try {
            const { data } = await this.googleSheets.readSheet('Top_10_Firms');
            
            return data
                .filter(firm => {
                    if (specialty && !firm.Specialties?.toLowerCase().includes(specialty.toLowerCase())) {
                        return false;
                    }
                    if (location && !firm.Location?.toLowerCase().includes(location.toLowerCase())) {
                        return false;
                    }
                    return true;
                })
                .map(firm => ({
                    id: `sheets_firm_${firm.ID || Math.random()}`,
                    name: firm.Name || firm['Firm Name'] || '',
                    location: firm.Location || `${firm.City || ''}, ${firm.State || ''}`,
                    phone: firm.Phone || '',
                    website: firm.Website || '',
                    specialties: this.parseList(firm.Specialties || ''),
                    experience: firm['Years Experience'] || firm.Experience || '',
                    successRate: firm['Success Rate'] || '',
                    notableSettlements: this.parseList(firm['Notable Settlements'] || ''),
                    source: 'google_sheets'
                }));
        } catch (error) {
            console.error('❌ Error reading law firms from sheets:', error);
            return [];
        }
    }

    /**
     * Get law firms from HubSpot
     */
    async getLawFirmsFromHubSpot(specialty = null, location = null) {
        if (!this.hubspot) {
            console.log('⚠️ HubSpot connector not available');
            return [];
        }
        
        try {
            const firms = await this.hubspot.findLawFirms(specialty || '', location, 20);
            
            return firms.map(firm => ({
                id: `hubspot_firm_${firm.id}`,
                name: firm.name,
                location: firm.location,
                phone: firm.phone,
                website: firm.website,
                specialties: firm.specialties,
                experience: firm.experience,
                successRate: firm.successRate,
                notableSettlements: firm.notableSettlements,
                source: 'hubspot'
            }));
        } catch (error) {
            console.error('❌ Error reading law firms from HubSpot:', error);
            return [];
        }
    }

    /**
     * Get settlement data for a condition
     */
    async getSettlementData(condition, state = null) {
        const cacheKey = `settlement_${condition}_${state}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const [sheetsData, hubspotData] = await Promise.all([
                this.getSettlementDataFromGoogleSheets(condition, state),
                this.getSettlementDataFromHubSpot(condition, state)
            ]);

            // Merge settlement data
            const mergedData = this.mergeSettlementData(sheetsData, hubspotData);
            
            // If no settlement data found from connectors, use fallback data
            if (mergedData.length === 0) {
                console.log('📋 Using fallback settlement data');
                const fallbackData = this.getDefaultSettlementData(condition);
                this.setCache(cacheKey, fallbackData);
                return fallbackData;
            }
            
            this.setCache(cacheKey, mergedData);
            return mergedData;
        } catch (error) {
            console.error('❌ Error fetching settlement data:', error);
            console.log('📋 Using fallback settlement data due to error');
            const fallbackData = this.getDefaultSettlementData(condition);
            return fallbackData;
        }
    }

    /**
     * Get settlement data from Google Sheets
     */
    async getSettlementDataFromGoogleSheets(condition, state = null) {
        if (!this.googleSheets) {
            console.log('⚠️ Google Sheets connector not available');
            return [];
        }
        
        try {
            const { data } = await this.googleSheets.searchSheet('Case_Amounts', condition, 'Case Type', 20);
            
            return data
                .filter(row => !state || row.State?.toLowerCase().includes(state.toLowerCase()))
                .map(row => ({
                    condition: row.Condition || '',
                    state: row.State || '',
                    settlementRange: row['Settlement Range'] || row.Settlements || '',
                    averageSettlement: row['Average Settlement'] || '',
                    totalCases: row['Total Cases'] || '',
                    year: row.Year || '',
                    source: 'google_sheets'
                }));
        } catch (error) {
            console.error('❌ Error reading settlements from sheets:', error);
            return [];
        }
    }

    /**
     * Get settlement data from HubSpot
     */
    async getSettlementDataFromHubSpot(condition, state = null) {
        if (!this.hubspot) {
            console.log('⚠️ HubSpot connector not available');
            return [];
        }
        
        try {
            const data = await this.hubspot.getSettlementData(condition, state);
            return data.map(item => ({
                ...item,
                source: 'hubspot'
            }));
        } catch (error) {
            console.error('❌ Error reading settlements from HubSpot:', error);
            return [];
        }
    }

    /**
     * Search for comprehensive information about a condition
     */
    async searchCondition(condition) {
        const cacheKey = `search_${condition}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const [articles, lawFirms, settlements] = await Promise.all([
                this.searchArticles(condition),
                this.getLawFirms(condition),
                this.getSettlementData(condition)
            ]);

            const result = {
                condition,
                articles,
                lawFirms,
                settlements,
                summary: this.generateSummary(condition, articles, settlements)
            };

            this.setCache(cacheKey, result);
            return result;
        } catch (error) {
            console.error('❌ Error searching condition:', error);
            return {
                condition,
                articles: [],
                lawFirms: [],
                settlements: [],
                summary: `Information about ${condition} is currently being updated.`
            };
        }
    }

    /**
     * Search articles by condition
     */
    async searchArticles(condition) {
        const allArticles = await this.getAllArticles();
        
        return allArticles.filter(article => 
            article.title.toLowerCase().includes(condition.toLowerCase()) ||
            article.description.toLowerCase().includes(condition.toLowerCase()) ||
            article.content.overview.toLowerCase().includes(condition.toLowerCase())
        );
    }

    // Helper methods
    createSlug(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }

    parseList(text) {
        if (!text) return [];
        return text.split(/[,;|]/).map(item => item.trim()).filter(item => item);
    }

    mergeArticles(sheetsArticles, hubspotArticles) {
        const merged = [...sheetsArticles, ...hubspotArticles];
        
        // Remove duplicates based on title
        const seen = new Set();
        return merged.filter(article => {
            const key = article.title.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    mergeSettlementData(sheetsData, hubspotData) {
        const merged = [...sheetsData, ...hubspotData];
        
        // Group by condition and state
        const grouped = {};
        merged.forEach(item => {
            const key = `${item.condition}_${item.state || 'all'}`;
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(item);
        });

        // Return the most comprehensive data for each group
        return Object.values(grouped).map(group => 
            group.reduce((best, current) => 
                (current.settlementRange && !best.settlementRange) ? current : best
            )
        );
    }

    generateSummary(condition, articles, settlements) {
        const article = articles[0];
        const settlement = settlements[0];
        
        let summary = `Information about ${condition}`;
        
        if (article) {
            summary += `. ${article.content.overview.substring(0, 200)}...`;
        }
        
        if (settlement) {
            summary += ` Typical settlements range from ${settlement.settlementRange}.`;
        }
        
        return summary;
    }

    getDefaultSettlementData(condition) {
        const defaults = {
            'mesothelioma': { 
                condition: 'Mesothelioma',
                settlementRange: '$1.2 million to $2.4 million',
                averageSettlement: '$1.8 million',
                totalCases: 'Thousands',
                year: '2024',
                source: 'fallback'
            },
            'lung cancer': { 
                condition: 'Lung Cancer',
                settlementRange: '$500,000 to $1.5 million',
                averageSettlement: '$1 million',
                totalCases: 'Hundreds',
                year: '2024',
                source: 'fallback'
            },
            'ovarian cancer': { 
                condition: 'Ovarian Cancer',
                settlementRange: '$100,000 to $500,000',
                averageSettlement: '$300,000',
                totalCases: 'Thousands',
                year: '2024',
                source: 'fallback'
            },
            'non-hodgkin lymphoma': { 
                condition: 'Non-Hodgkin Lymphoma',
                settlementRange: '$50,000 to $250,000',
                averageSettlement: '$150,000',
                totalCases: 'Hundreds',
                year: '2024',
                source: 'fallback'
            }
        };
        
        return [defaults[condition.toLowerCase()] || { 
            condition: condition,
            settlementRange: 'Varies by case',
            averageSettlement: 'Contact attorney for estimate',
            totalCases: 'Varies',
            year: '2024',
            source: 'fallback'
        }];
    }

    getFallbackLawFirms() {
        return [
            {
                id: 'fallback_firm_1',
                name: 'Saddle Rock Legal Group',
                location: 'Nationwide',
                phone: '(800) 123-4567',
                website: 'https://legalinjuryadvocates.com',
                specialties: ['Mesothelioma', 'Asbestos', 'Product Liability'],
                experience: '20+ years',
                successRate: '95%',
                notableSettlements: ['$2.4M mesothelioma settlement', '$1.8M asbestos case'],
                source: 'fallback'
            },
            {
                id: 'fallback_firm_2',
                name: 'National Injury Law Center',
                location: 'California, Texas, Florida',
                phone: '(800) 987-6543',
                website: 'https://nationalinjury.com',
                specialties: ['Roundup', 'Talcum Powder', 'Medical Devices'],
                experience: '15+ years',
                successRate: '90%',
                notableSettlements: ['$250K Roundup settlement', '$500K talc case'],
                source: 'fallback'
            },
            {
                id: 'fallback_firm_3',
                name: 'Veterans Legal Services',
                location: 'Nationwide',
                phone: '(800) 555-0123',
                website: 'https://veteranslegal.org',
                specialties: ['3M Earplugs', 'Military Injuries', 'VA Benefits'],
                experience: '25+ years',
                successRate: '88%',
                notableSettlements: ['$100K earplug case', '$75K tinnitus claim'],
                source: 'fallback'
            }
        ];
    }

    getFallbackArticles() {
        // Return comprehensive fallback data if connectors fail
        return [
            {
                id: 1,
                title: "Mesothelioma and Asbestos Exposure",
                description: "Comprehensive guide to mesothelioma, its causes, symptoms, and legal options for victims of asbestos exposure.",
                slug: "mesothelioma-asbestos-exposure",
                category: 'medical',
                date: new Date().toISOString(),
                content: {
                    overview: "Mesothelioma is a rare and aggressive cancer that develops in the lining of the lungs, abdomen, or heart. It is primarily caused by exposure to asbestos, a naturally occurring mineral that was widely used in construction, manufacturing, and other industries until the late 1970s.",
                    symptoms: [
                        "Chest pain and shortness of breath",
                        "Persistent cough and fatigue",
                        "Weight loss and loss of appetite",
                        "Fluid buildup around the lungs",
                        "Abdominal pain and swelling (for peritoneal mesothelioma)"
                    ],
                    causes: [
                        "Asbestos exposure in the workplace",
                        "Secondary exposure through family members",
                        "Environmental exposure near asbestos mines or factories",
                        "Exposure during home renovations or demolition"
                    ],
                    treatments: [
                        "Surgery to remove tumors",
                        "Chemotherapy and radiation therapy",
                        "Immunotherapy and targeted therapy",
                        "Palliative care for symptom management"
                    ],
                    legalOptions: [
                        "Personal injury lawsuits against asbestos manufacturers",
                        "Workers' compensation claims",
                        "Asbestos trust fund claims",
                        "Wrongful death lawsuits for family members"
                    ],
                    settlements: "Mesothelioma settlements typically range from $1.2 million to $2.4 million, with some cases reaching $10 million or more. Factors affecting settlement amounts include the severity of the disease, age of the victim, exposure history, and jurisdiction."
                },
                source: 'fallback'
            },
            {
                id: 2,
                title: "Roundup Weedkiller Cancer Lawsuits",
                description: "Information about Roundup lawsuits alleging the weedkiller causes non-Hodgkin lymphoma and other cancers.",
                slug: "roundup-weedkiller-cancer-lawsuits",
                category: 'legal',
                date: new Date().toISOString(),
                content: {
                    overview: "Roundup is a popular weedkiller manufactured by Monsanto (now owned by Bayer). The active ingredient, glyphosate, has been linked to non-Hodgkin lymphoma and other cancers in numerous studies and lawsuits.",
                    symptoms: [
                        "Swollen lymph nodes in neck, armpits, or groin",
                        "Unexplained weight loss and fatigue",
                        "Night sweats and fever",
                        "Chest pain and shortness of breath",
                        "Abdominal pain and swelling"
                    ],
                    causes: [
                        "Direct exposure to Roundup during application",
                        "Exposure to glyphosate in food and water",
                        "Occupational exposure in agriculture and landscaping",
                        "Residential use in gardens and lawns"
                    ],
                    treatments: [
                        "Chemotherapy and radiation therapy",
                        "Immunotherapy and targeted therapy",
                        "Stem cell transplantation",
                        "Clinical trials for new treatments"
                    ],
                    legalOptions: [
                        "Product liability lawsuits against Bayer/Monsanto",
                        "Class action lawsuits",
                        "Wrongful death claims",
                        "Settlement fund claims"
                    ],
                    settlements: "Bayer has agreed to pay $10.9 billion to settle approximately 100,000 Roundup lawsuits. Individual settlements typically range from $5,000 to $250,000, depending on the severity of the cancer and exposure history."
                },
                source: 'fallback'
            },
            {
                id: 3,
                title: "3M Combat Arms Earplug Litigation",
                description: "Details about the 3M earplug lawsuits alleging defective military earplugs caused hearing loss and tinnitus.",
                slug: "3m-combat-arms-earplug-litigation",
                category: 'legal',
                date: new Date().toISOString(),
                content: {
                    overview: "3M Combat Arms earplugs were issued to military personnel between 2003 and 2015. Veterans allege the earplugs were defective and failed to protect their hearing, leading to hearing loss and tinnitus.",
                    symptoms: [
                        "Hearing loss in one or both ears",
                        "Ringing or buzzing in the ears (tinnitus)",
                        "Difficulty understanding speech",
                        "Sensitivity to loud noises",
                        "Balance problems and dizziness"
                    ],
                    causes: [
                        "Defective design of the earplugs",
                        "Failure to properly seal the ear canal",
                        "Inadequate noise reduction",
                        "Manufacturing defects"
                    ],
                    treatments: [
                        "Hearing aids and cochlear implants",
                        "Tinnitus management therapy",
                        "Cognitive behavioral therapy",
                        "Sound therapy and masking devices"
                    ],
                    legalOptions: [
                        "Product liability lawsuits against 3M",
                        "Veterans' disability benefits",
                        "Class action lawsuits",
                        "Settlement fund claims"
                    ],
                    settlements: "3M has agreed to pay $6 billion to settle approximately 260,000 earplug lawsuits. Individual settlements average around $24,000, with some cases reaching $100,000 or more depending on the severity of hearing damage."
                },
                source: 'fallback'
            },
            {
                id: 4,
                title: "Silicosis and Silica Dust Exposure",
                description: "Information about silicosis, a lung disease caused by exposure to silica dust in construction and manufacturing.",
                slug: "silicosis-silica-dust-exposure",
                category: 'medical',
                date: new Date().toISOString(),
                content: {
                    overview: "Silicosis is a progressive lung disease caused by inhaling crystalline silica dust. It commonly affects workers in construction, mining, manufacturing, and other industries where silica dust is present.",
                    symptoms: [
                        "Shortness of breath and chest pain",
                        "Persistent cough and fatigue",
                        "Weight loss and loss of appetite",
                        "Fever and night sweats",
                        "Cyanosis (bluish skin color)"
                    ],
                    causes: [
                        "Exposure to silica dust in construction",
                        "Mining and quarrying operations",
                        "Manufacturing of glass, ceramics, and stone products",
                        "Sandblasting and abrasive blasting",
                        "Tunnel construction and drilling"
                    ],
                    treatments: [
                        "Oxygen therapy and pulmonary rehabilitation",
                        "Medications to reduce inflammation",
                        "Lung transplantation in severe cases",
                        "Prevention of further exposure"
                    ],
                    legalOptions: [
                        "Workers' compensation claims",
                        "Personal injury lawsuits against employers",
                        "Product liability claims against equipment manufacturers",
                        "Class action lawsuits"
                    ],
                    settlements: "Silicosis settlements vary widely based on the severity of the disease and jurisdiction. Typical settlements range from $50,000 to $500,000, with some cases reaching $1 million or more for severe cases."
                },
                source: 'fallback'
            },
            {
                id: 5,
                title: "Talcum Powder Ovarian Cancer Lawsuits",
                description: "Information about talcum powder lawsuits alleging the product causes ovarian cancer in women.",
                slug: "talcum-powder-ovarian-cancer-lawsuits",
                category: 'legal',
                date: new Date().toISOString(),
                content: {
                    overview: "Talcum powder lawsuits allege that Johnson & Johnson's talc-based products, including Baby Powder and Shower to Shower, contain asbestos and cause ovarian cancer in women who used them for feminine hygiene.",
                    symptoms: [
                        "Abdominal bloating and pain",
                        "Pelvic pain and pressure",
                        "Changes in bowel habits",
                        "Frequent urination",
                        "Unexplained weight loss"
                    ],
                    causes: [
                        "Long-term use of talcum powder for feminine hygiene",
                        "Asbestos contamination in talc products",
                        "Inhalation of talc particles",
                        "Application to genital area"
                    ],
                    treatments: [
                        "Surgery to remove ovaries and fallopian tubes",
                        "Chemotherapy and radiation therapy",
                        "Targeted therapy and immunotherapy",
                        "Hormone therapy"
                    ],
                    legalOptions: [
                        "Product liability lawsuits against Johnson & Johnson",
                        "Wrongful death claims",
                        "Class action lawsuits",
                        "Settlement fund claims"
                    ],
                    settlements: "Johnson & Johnson has faced thousands of talcum powder lawsuits. Individual settlements have ranged from $100,000 to $100 million, with some jury verdicts exceeding $4 billion. The company has set aside billions for settlements."
                },
                source: 'fallback'
            },
            {
                id: 6,
                title: "Paraquat Parkinson's Disease Lawsuits",
                description: "Information about Paraquat lawsuits alleging the herbicide causes Parkinson's disease in agricultural workers.",
                slug: "paraquat-parkinsons-disease-lawsuits",
                category: 'legal',
                date: new Date().toISOString(),
                content: {
                    overview: "Paraquat is a highly toxic herbicide used in agriculture. Studies have linked Paraquat exposure to an increased risk of Parkinson's disease, leading to thousands of lawsuits against manufacturers.",
                    symptoms: [
                        "Tremors in hands, arms, legs, or jaw",
                        "Slowed movement and stiffness",
                        "Balance problems and falls",
                        "Speech and swallowing difficulties",
                        "Cognitive changes and depression"
                    ],
                    causes: [
                        "Direct exposure during application",
                        "Inhalation of Paraquat spray",
                        "Skin contact with contaminated surfaces",
                        "Accidental ingestion or exposure"
                    ],
                    treatments: [
                        "Medications to manage symptoms",
                        "Deep brain stimulation",
                        "Physical and occupational therapy",
                        "Speech therapy and dietary changes"
                    ],
                    legalOptions: [
                        "Product liability lawsuits against manufacturers",
                        "Workers' compensation claims",
                        "Class action lawsuits",
                        "Wrongful death claims"
                    ],
                    settlements: "Paraquat lawsuits are still in early stages, but settlements are expected to range from $100,000 to $1 million or more, depending on the severity of Parkinson's symptoms and exposure history."
                },
                source: 'fallback'
            }
        ];
    }

    // Cache management
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
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
     * Generate keywords from case name for better matching
     */
    generateKeywordsFromCaseName(caseName) {
        if (!caseName) return [];
        
        const keywords = [caseName.toLowerCase()];
        
        // Add common variations and related terms - more specific to prevent cross-contamination
        const caseVariations = {
            'roundup': ['glyphosate', 'weed killer', 'herbicide', 'monsanto', 'bayer'],
            'hair relaxer': ['hair straightener', 'chemical straightener', 'relaxer', 'uterine cancer'],
            'mesothelioma': ['asbestos', 'asbestos exposure', 'pleural mesothelioma', 'peritoneal mesothelioma'],
            'pfas': ['forever chemicals', 'water contamination', 'pfas chemicals', 'perfluoroalkyl', 'pfoa', 'pfos'],
            'depo-provera': ['birth control', 'contraceptive', 'medroxyprogesterone'],
            'necrotizing enterocolitis': ['nec', 'premature baby', 'intestinal disease'],
            'paraquat': ['herbicide', 'weed killer', 'parkinson\'s disease', 'parkinsons'],
            'talcum powder': ['talc', 'baby powder', 'ovarian cancer', 'johnson & johnson', 'johnson and johnson'],
            'camp lejeune': ['camp lejeune', 'water contamination', 'military base', 'marine corps'],
            'afff': ['firefighting foam', 'pfas', 'firefighter', 'military foam']
        };
        
        const lowerCaseName = caseName.toLowerCase();
        
        // Add specific variations for known cases - only if there's a direct match
        for (const [key, variations] of Object.entries(caseVariations)) {
            if (lowerCaseName === key || lowerCaseName.includes(key)) {
                keywords.push(...variations);
                break; // Only match one case type to prevent cross-contamination
            }
        }
        
        // Add individual words from case name
        const words = caseName.toLowerCase().split(/\s+/);
        keywords.push(...words);
        
        // Remove duplicates and empty strings
        return [...new Set(keywords)].filter(k => k.length > 0);
    }

    /**
     * Parse the Active field from various formats
     */
    parseActiveField(activeValue) {
        if (!activeValue) return true; // Default to true if no value provided
        
        const value = activeValue.toString().toLowerCase().trim();
        
        // Handle boolean values
        if (value === 'true' || value === 'yes' || value === '1' || value === 'active') {
            return true;
        }
        
        // Handle false values
        if (value === 'false' || value === 'no' || value === '0' || value === 'inactive') {
            return false;
        }
        
        // Default to true for any other value
        return true;
    }

    /**
     * Check if a row looks like a header row
     */
    isHeaderRow(row) {
        if (!row || row.length === 0) return false;
        
        const firstCell = row[0]?.toString().toLowerCase() || '';
        
        // Common header indicators
        const headerIndicators = [
            'case type', 'name', 'title', 'header', 'column', 'field',
            'case', 'type', 'description', 'status', 'active', 'keywords'
        ];
        
        return headerIndicators.some(indicator => firstCell.includes(indicator));
    }

    /**
     * Get LIA Active Cases from Google Sheets
     */
    async getLIAActiveCases() {
        const cacheKey = 'lia_active_cases';
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        if (!this.googleSheets) {
            console.log('⚠️ Google Sheets connector not available for LIA cases');
            return this.getFallbackLIACases();
        }

        try {
            console.log('📊 Fetching LIA Active Cases from Google Sheets...');
            const { data, headers } = await this.googleSheets.readSheet('Legal Injury Advocates Active cases');
            
            console.log('📋 Sheet headers:', headers);
            console.log('📋 First few rows:', data.slice(0, 3));
            
            if (!data || data.length === 0) {
                console.log('⚠️ No LIA active cases found in Google Sheets, using fallback');
                return this.getFallbackLIACases();
            }

            // Handle case list structure with Active field
            let activeCases = data
                .filter(row => {
                    // Check if row has a case name
                    const caseName = row['Case Type'] || row.Name || row.name || row[Object.keys(row)[0]] || '';
                    if (!caseName || caseName.trim().length === 0) return false;
                    
                    // Check if the case is marked as active
                    const isActive = this.parseActiveField(row['Active'] || row.active || row['Status'] || row.status || 'true');
                    return isActive;
                })
                .map(row => {
                    // Get case name from first column or named column
                    const caseName = row['Case Type'] || row.Name || row.name || row[Object.keys(row)[0]] || '';
                    
                    // Generate keywords from case name
                    const keywords = this.generateKeywordsFromCaseName(caseName);
                    
                    return {
                        caseType: this.createSlug(caseName),
                        name: caseName,
                        description: row['Description'] || `${caseName} cases`,
                        keywords: keywords,
                        active: true,
                        lastUpdated: row['Last Updated'] || new Date().toISOString(),
                        source: 'google_sheets'
                    };
                });

            // If no cases found with headers, try reading raw data
            if (activeCases.length === 0 && headers.length > 0) {
                console.log('🔄 No cases found with headers, trying raw data approach...');
                
                // Get the raw values from the sheet
                const rawData = await this.googleSheets.makeRequest(`/${this.googleSheets.spreadsheetId}/values/Legal Injury Advocates Active cases`);
                
                if (rawData.values && rawData.values.length > 0) {
                    // Skip first row if it looks like a header, otherwise use all rows
                    const startRow = this.isHeaderRow(rawData.values[0]) ? 1 : 0;
                    
                    activeCases = rawData.values.slice(startRow)
                        .filter(row => {
                            // Check if first column has data
                            if (!row[0] || row[0].trim().length === 0) return false;
                            
                            // Check if the case is marked as active (assuming Active is in column 2, or default to true)
                            const activeValue = row[1] || 'true'; // Column B for Active field
                            const isActive = this.parseActiveField(activeValue);
                            return isActive;
                        })
                        .map(row => {
                            const caseName = row[0]; // First column contains case names
                            const keywords = this.generateKeywordsFromCaseName(caseName);
                            
                            return {
                                caseType: this.createSlug(caseName),
                                name: caseName,
                                description: row[2] || `${caseName} cases`, // Column C for Description
                                keywords: keywords,
                                active: true,
                                lastUpdated: row[3] || new Date().toISOString(), // Column D for Last Updated
                                source: 'google_sheets'
                            };
                        });
                    
                    console.log(`✅ Found ${activeCases.length} cases using raw data approach`);
                }
            }

            // Also include all cases (active and inactive) for admin purposes
            const allCases = data.map(row => {
                const caseName = row['Case Type'] || row.Name || row.name || row[Object.keys(row)[0]] || '';
                const isActive = this.parseActiveField(row['Active'] || row.active || row['Status'] || row.status || 'true');
                
                const keywords = this.generateKeywordsFromCaseName(caseName);
                
                return {
                    caseType: this.createSlug(caseName),
                    name: caseName,
                    description: row['Description'] || `${caseName} cases`,
                    keywords: keywords,
                    active: isActive,
                    lastUpdated: row['Last Updated'] || new Date().toISOString(),
                    source: 'google_sheets'
                };
            });

            const result = {
                activeCases,
                allCases,
                totalActive: activeCases.length,
                totalCases: allCases.length,
                lastUpdated: new Date().toISOString(),
                source: 'google_sheets'
            };

            console.log(`✅ Fetched ${activeCases.length} active LIA cases out of ${allCases.length} total cases`);
            this.setCache(cacheKey, result);
            return result;

        } catch (error) {
            console.error('❌ Error fetching LIA cases from Google Sheets:', error);
            console.log('📋 Using fallback LIA cases due to error');
            return this.getFallbackLIACases();
        }
    }

    /**
     * Check if a query relates to any LIA active case
     */
    async checkLIAActiveCase(query) {
        try {
            const liaData = await this.getLIAActiveCases();
            const lowerQuery = query.toLowerCase();
            
            console.log(`🔍 Checking LIA active case for query: "${query}"`);
            console.log(`📋 Available active cases:`, liaData.activeCases.map(c => `${c.name} (${c.caseType})`));
            
            for (const caseInfo of liaData.activeCases) {
                // Check if any of the case keywords are present in the query
                const matchingKeywords = caseInfo.keywords.filter(keyword => 
                    lowerQuery.includes(keyword.toLowerCase())
                );
                
                if (matchingKeywords.length > 0) {
                    console.log(`✅ Query matches case "${caseInfo.name}" with keywords: ${matchingKeywords.join(', ')}`);
                    console.log(`📝 Case description: ${caseInfo.description}`);
                    
                    return {
                        isActive: true,
                        caseType: caseInfo.caseType,
                        name: caseInfo.name,
                        description: caseInfo.description,
                        keywords: caseInfo.keywords,
                        lastUpdated: caseInfo.lastUpdated,
                        matchedKeywords: matchingKeywords
                    };
                }
            }
            
            console.log(`❌ No active LIA case matches found for query: "${query}"`);
            return { isActive: false };
        } catch (error) {
            console.error('❌ Error checking LIA active case:', error);
            return { isActive: false, error: error.message };
        }
    }

    /**
     * Fallback LIA cases when Google Sheets is unavailable
     */
    getFallbackLIACases() {
        const fallbackCases = [
            {
                caseType: 'mesothelioma',
                name: 'Mesothelioma',
                description: 'Mesothelioma and asbestos exposure cases',
                keywords: ['mesothelioma', 'asbestos', 'asbestos exposure', 'pleural mesothelioma'],
                active: true,
                lastUpdated: new Date().toISOString(),
                source: 'fallback'
            },
            {
                caseType: 'talcum_powder',
                name: 'Talcum Powder',
                description: 'Talcum powder ovarian cancer cases',
                keywords: ['talcum powder', 'talc', 'baby powder', 'ovarian cancer', 'johnson & johnson'],
                active: true,
                lastUpdated: new Date().toISOString(),
                source: 'fallback'
            },
            {
                caseType: 'pfas',
                name: 'PFAS/Forever Chemicals',
                description: 'PFAS and forever chemicals in water contamination cases',
                keywords: ['pfas', 'forever chemicals', 'water contamination', 'pfoa', 'pfos', 'perfluoroalkyl'],
                active: false, // Set to false by default - only activate if LIA actually handles these
                lastUpdated: new Date().toISOString(),
                source: 'fallback'
            }
        ];

        return {
            activeCases: fallbackCases.filter(caseInfo => caseInfo.active),
            allCases: fallbackCases,
            totalActive: fallbackCases.filter(caseInfo => caseInfo.active).length,
            totalCases: fallbackCases.length,
            lastUpdated: new Date().toISOString(),
            source: 'fallback'
        };
    }
} 