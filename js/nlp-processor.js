class NLPProcessor {
    constructor() {
        this.patterns = {
            // Basic contact information
            email: /[\w\.-]+@[\w\.-]+\.\w+/gi,
            phone: /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/gi,
            
            // Names - try to catch various formats
            clientName: [
                /(?:client|author|name):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
                /(?:by|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi
            ],
            
            // Book information
            bookTitle: [
                /(?:book|title|book title):\s*([A-Z][^,\n\r]+)/gi,
                /(?:called|titled)\s*["']([^"']+)["']/gi,
                /book:\s*([A-Z][^,\n\r]+)/gi
            ],
            
            // Word count
            wordCount: [
                /(?:word count|words?):\s*([0-9,]+)/gi,
                /([0-9,]+)\s*words?/gi
            ],
            
            // Genre/manuscript type
            genre: [
                /(?:genre|type|category):\s*([A-Z][a-z]+(?:\/[A-Z][a-z]+)?)/gi,
                /(?:fiction|nonfiction|non-fiction|business|memoir|self-help|romance|mystery|thriller|fantasy|sci-fi|science fiction|biography|history|cooking|health|fitness)/gi
            ],
            
            // Services mentioned
            services: {
                editing: [
                    /(?:developmental|dev)\s*edit/gi,
                    /line\s*edit/gi,
                    /copy\s*edit/gi,
                    /proofread/gi,
                    /editing/gi
                ],
                marketing: [
                    /bestseller/gi,
                    /campaign/gi,
                    /website/gi,
                    /press\s*release/gi,
                    /marketing/gi,
                    /promotion/gi
                ],
                publishing: [
                    /publish/gi,
                    /print/gi,
                    /ebook/gi,
                    /audiobook/gi,
                    /hardcover/gi
                ]
            },
            
            // Budget information
            budget: [
                /budget:\s*\$?([0-9,]+)/gi,
                /\$([0-9,]+)/gi,
                /([0-9,]+)\s*dollars?/gi
            ]
        };
    }

    // Main parsing function
    parseAuthorInfo(text) {
        // Store original text for service mapping
        this.originalText = text;
        
        const extracted = {
            clientName: this.extractClientName(text),
            bookTitle: this.extractBookTitle(text),
            email: this.extractEmail(text),
            phone: this.extractPhone(text),
            wordCount: this.extractWordCount(text),
            genre: this.extractGenre(text),
            manuscriptType: this.determineManuscriptType(text),
            services: this.extractServices(text),
            budget: this.extractBudget(text)
        };

        return extracted;
    }

    extractClientName(text) {
        // First try exact "Client:" pattern
        const clientMatch = text.match(/Client:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i);
        if (clientMatch) {
            return clientMatch[1].trim();
        }
        
        // Try other name patterns
        for (const pattern of this.patterns.clientName) {
            pattern.lastIndex = 0; // Reset regex state
            const match = pattern.exec(text);
            if (match) {
                return match[1].trim();
            }
        }
        
        // Fallback: look for capitalized words at the beginning of lines
        const lines = text.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            // Skip lines that are clearly not names
            if (trimmed.toLowerCase().includes('client:') || 
                trimmed.toLowerCase().includes('services') ||
                trimmed.toLowerCase().includes('book') ||
                trimmed.toLowerCase().includes('email') ||
                trimmed.toLowerCase().includes('phone')) {
                continue;
            }
            
            if (trimmed.match(/^[A-Z][a-z]+\s+[A-Z][a-z]+$/)) {
                const words = trimmed.split(/\s+/);
                if (words.length >= 2 && words.length <= 3) {
                    return words.join(' ');
                }
            }
        }
        
        return null;
    }

    extractBookTitle(text) {
        // First try exact "Book Title:" pattern
        const titleMatch = text.match(/Book Title:\s*([^\n\r]+)/i);
        if (titleMatch) {
            return titleMatch[1].trim().replace(/[\[\]]/g, ''); // Remove brackets like [Not specified - marriage advice book]
        }
        
        // Try other title patterns
        for (const pattern of this.patterns.bookTitle) {
            pattern.lastIndex = 0; // Reset regex state
            const match = pattern.exec(text);
            if (match) {
                return match[1].trim().replace(/['"]/g, '');
            }
        }
        
        // Look for book description patterns
        const descMatch = text.match(/marriage advice book|empty nesters|Christian Living/i);
        if (descMatch) {
            return null; // Don't extract generic descriptions as titles
        }
        
        return null;
    }

    extractEmail(text) {
        const match = this.patterns.email.exec(text);
        return match ? match[0] : null;
    }

    extractPhone(text) {
        const match = this.patterns.phone.exec(text);
        if (match) {
            // Format phone number consistently
            const digits = match[0].replace(/\D/g, '');
            if (digits.length === 10) {
                return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
            } else if (digits.length === 11 && digits[0] === '1') {
                return `+1 (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
            }
            return match[0];
        }
        return null;
    }

    extractWordCount(text) {
        // First try exact "Word Count:" pattern
        const wordCountMatch = text.match(/Word Count:\s*(?:Approximately\s*)?([0-9,]+)/i);
        if (wordCountMatch) {
            return parseInt(wordCountMatch[1].replace(/,/g, ''));
        }
        
        // Try other patterns
        for (const pattern of this.patterns.wordCount) {
            pattern.lastIndex = 0; // Reset regex state
            const match = pattern.exec(text);
            if (match) {
                const count = match[1].replace(/,/g, '');
                return parseInt(count);
            }
        }
        return null;
    }

    extractGenre(text) {
        for (const pattern of this.patterns.genre) {
            const match = pattern.exec(text);
            if (match) {
                return match[1] || match[0];
            }
        }
        return null;
    }

    determineManuscriptType(text) {
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('fiction') && !lowerText.includes('nonfiction') && !lowerText.includes('non-fiction')) {
            return 'fiction';
        } else if (lowerText.includes('nonfiction') || lowerText.includes('non-fiction') || 
                   lowerText.includes('business') || lowerText.includes('memoir') || 
                   lowerText.includes('self-help') || lowerText.includes('biography')) {
            return 'nonfiction';
        }
        
        return null;
    }

    extractServices(text) {
        const services = {
            editing: [],
            marketing: [],
            publishing: []
        };

        for (const [category, patterns] of Object.entries(this.patterns.services)) {
            for (const pattern of patterns) {
                const matches = text.match(pattern);
                if (matches) {
                    services[category] = services[category].concat(matches);
                }
            }
        }

        // Remove duplicates and clean up
        for (const category of Object.keys(services)) {
            services[category] = [...new Set(services[category])];
        }

        return services;
    }

    extractBudget(text) {
        for (const pattern of this.patterns.budget) {
            const match = pattern.exec(text);
            if (match) {
                const amount = match[1].replace(/,/g, '');
                return parseInt(amount);
            }
        }
        return null;
    }

    // Map extracted data to PDF form fields
    mapToFormFields(extractedData, fieldMappings) {
        const formData = {};
        const text = this.originalText || '';

        // Map basic fields
        if (extractedData.clientName && fieldMappings.clientName) {
            formData[fieldMappings.clientName] = extractedData.clientName;
        }
        
        if (extractedData.bookTitle && fieldMappings.bookTitle) {
            formData[fieldMappings.bookTitle] = extractedData.bookTitle;
        }
        
        if (extractedData.email && fieldMappings.email) {
            formData[fieldMappings.email] = extractedData.email;
        }
        
        if (extractedData.phone && fieldMappings.phone) {
            formData[fieldMappings.phone] = extractedData.phone;
        }
        
        if (extractedData.wordCount && fieldMappings.wordCount) {
            formData[fieldMappings.wordCount] = extractedData.wordCount.toString();
        }

        // Map manuscript type checkboxes
        if (extractedData.manuscriptType) {
            if (extractedData.manuscriptType === 'fiction' && fieldMappings.fictionManuscript) {
                formData[fieldMappings.fictionManuscript] = true;
            } else if (extractedData.manuscriptType === 'nonfiction' && fieldMappings.nonfictionManuscript) {
                formData[fieldMappings.nonfictionManuscript] = true;
            }
        }

        // Map editing services based on text content
        if (text.toLowerCase().includes('line editing') && fieldMappings.lineEditing) {
            formData[fieldMappings.lineEditing] = true;
        } else if (text.toLowerCase().includes('developmental editing') && fieldMappings.developmentalEditing) {
            formData[fieldMappings.developmentalEditing] = true;
        } else if (text.toLowerCase().includes('copy editing') && fieldMappings.copyEditingProofreadingCombined) {
            formData[fieldMappings.copyEditingProofreadingCombined] = true;
        } else if (text.toLowerCase().includes('proofreading') && fieldMappings.proofreadingOnly) {
            formData[fieldMappings.proofreadingOnly] = true;
        }

        // Map publishing services
        if (text.toLowerCase().includes('cover design') || text.toLowerCase().includes('interior design')) {
            if (fieldMappings.bookDesignProduction) {
                formData[fieldMappings.bookDesignProduction] = true;
            }
        }
        
        if (text.toLowerCase().includes('amazon') && text.toLowerCase().includes('ingramspark')) {
            if (fieldMappings.amazonIngramSpark) {
                formData[fieldMappings.amazonIngramSpark] = true;
            }
        }
        
        if (text.toLowerCase().includes('copyright registration')) {
            if (fieldMappings.copyright) {
                formData[fieldMappings.copyright] = true;
            }
        }

        // Map marketing services
        if (text.toLowerCase().includes('bestseller campaign')) {
            if (fieldMappings.bestsellerCampaignFree) {
                formData[fieldMappings.bestsellerCampaignFree] = true;
            }
        }
        
        if (text.toLowerCase().includes('press release')) {
            if (fieldMappings.pressRelease) {
                formData[fieldMappings.pressRelease] = true;
            }
        }
        
        if (text.toLowerCase().includes('website')) {
            if (fieldMappings.authorWebsite) {
                formData[fieldMappings.authorWebsite] = true;
            }
        }

        return formData;
    }

    // Create a preview of what will be filled
    createPreview(extractedData, fieldMappings) {
        const mapped = this.mapToFormFields(extractedData, fieldMappings);
        const preview = [];

        for (const [fieldName, value] of Object.entries(mapped)) {
            preview.push({
                fieldName,
                value,
                type: typeof value === 'boolean' ? 'checkbox' : 'text',
                filled: value !== null && value !== undefined && value !== ''
            });
        }

        return preview;
    }
}

// Export for use in other modules
window.NLPProcessor = NLPProcessor;