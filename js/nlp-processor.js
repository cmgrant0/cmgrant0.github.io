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
        for (const pattern of this.patterns.clientName) {
            const match = pattern.exec(text);
            if (match) {
                return match[1].trim();
            }
        }
        
        // Fallback: look for capitalized words at the beginning of lines
        const lines = text.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.match(/^[A-Z][a-z]+\s+[A-Z][a-z]+/)) {
                const words = trimmed.split(/\s+/);
                if (words.length >= 2 && words.length <= 4) {
                    return words.slice(0, Math.min(3, words.length)).join(' ');
                }
            }
        }
        
        return null;
    }

    extractBookTitle(text) {
        for (const pattern of this.patterns.bookTitle) {
            const match = pattern.exec(text);
            if (match) {
                return match[1].trim().replace(/['"]/g, '');
            }
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
        for (const pattern of this.patterns.wordCount) {
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

        // Map common service selections
        if (extractedData.services.editing.some(service => 
            service.toLowerCase().includes('proofread')) && fieldMappings.proofreadingOnly) {
            formData[fieldMappings.proofreadingOnly] = true;
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