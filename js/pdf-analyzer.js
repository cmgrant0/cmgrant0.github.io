class PDFAnalyzer {
    constructor() {
        this.currentPDF = null;
        this.formFields = [];
    }

    async analyzePDF(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            this.currentPDF = await PDFLib.PDFDocument.load(arrayBuffer);
            
            // Extract form fields
            const form = this.currentPDF.getForm();
            const fields = form.getFields();
            
            this.formFields = fields.map(field => {
                const fieldData = {
                    name: field.getName(),
                    type: field.constructor.name.replace('PDF', '').replace('Field', ''),
                    value: null,
                    required: false
                };

                // Get current value based on field type
                try {
                    if (field.constructor.name === 'PDFTextField') {
                        fieldData.value = field.getText() || '';
                    } else if (field.constructor.name === 'PDFCheckBox') {
                        fieldData.value = field.isChecked();
                    } else if (field.constructor.name === 'PDFDropdown') {
                        fieldData.value = field.getSelected()[0] || '';
                        fieldData.options = field.getOptions();
                    } else if (field.constructor.name === 'PDFRadioGroup') {
                        fieldData.value = field.getSelected() || '';
                        fieldData.options = field.getOptions();
                    } else if (field.constructor.name === 'PDFButton') {
                        fieldData.value = field.getName();
                    }
                } catch (error) {
                    console.warn(`Could not get value for field ${field.getName()}:`, error);
                }

                return fieldData;
            });

            return {
                success: true,
                fieldCount: this.formFields.length,
                fields: this.formFields
            };
        } catch (error) {
            console.error('PDF Analysis Error:', error);
            return {
                success: false,
                error: error.message,
                fields: []
            };
        }
    }

    getFields() {
        return this.formFields;
    }

    getFieldByName(name) {
        return this.formFields.find(field => field.name === name);
    }

    getCurrentPDF() {
        return this.currentPDF;
    }

    // Create a template object for saving
    createTemplate(name) {
        return {
            name: name,
            created: new Date().toISOString(),
            fieldCount: this.formFields.length,
            fields: this.formFields.map(field => ({
                name: field.name,
                type: field.type,
                options: field.options || null
            }))
        };
    }

    // Display fields in the UI
    displayFields(containerId) {
        const container = document.getElementById(containerId);
        
        if (this.formFields.length === 0) {
            container.innerHTML = '<p class="no-fields">No form fields found in this PDF</p>';
            return;
        }

        const fieldsHTML = this.formFields.map(field => `
            <div class="field-item">
                <div class="field-info">
                    <div class="field-name">${field.name}</div>
                    <div class="field-type">Type: ${field.type}</div>
                    ${field.value !== null && field.value !== '' ? 
                        `<div class="field-value">Current: ${field.value}</div>` : ''
                    }
                    ${field.options ? 
                        `<div class="field-options">Options: ${field.options.join(', ')}</div>` : ''
                    }
                </div>
            </div>
        `).join('');

        container.innerHTML = fieldsHTML;
    }

    // Smart field mapping for Author Services Plan PDF
    getFieldMappings() {
        const mappings = {};
        
        this.formFields.forEach(field => {
            const name = field.name;
            
            // Exact field name mappings for Author Services Plan PDF
            switch (name) {
                // Basic client information
                case 'CLIENT NAME':
                    mappings.clientName = field.name;
                    break;
                case 'BOOK TITLE':
                    mappings.bookTitle = field.name;
                    break;
                case 'EMAIL ADDRESS':
                    mappings.email = field.name;
                    break;
                case 'PHONE NUMBER':
                    mappings.phone = field.name;
                    break;
                case 'Word Count':
                    mappings.wordCount = field.name;
                    break;
                    
                // Manuscript type
                case 'Nonfiction Manuscript':
                    mappings.nonfictionManuscript = field.name;
                    break;
                case 'Fiction Manuscript':
                    mappings.fictionManuscript = field.name;
                    break;
                    
                // Editing services
                case 'Proofreading ONLY Most Popular Option':
                    mappings.proofreadingOnly = field.name;
                    break;
                case 'Developmental Editing w Critique Report':
                    mappings.developmentalEditing = field.name;
                    break;
                case 'Line Editing SubstantiveStructural and Copy Editing':
                    mappings.lineEditing = field.name;
                    break;
                case 'CopyEditing Proofreading Combined':
                    mappings.copyEditingProofreadingCombined = field.name;
                    break;
                case 'Proofreading':
                    mappings.proofreading = field.name;
                    break;
                    
                // Publishing services
                case 'Book Design Production':
                    mappings.bookDesignProduction = field.name;
                    break;
                case 'Amazon IngramSpark MOST POPULAR':
                    mappings.amazonIngramSpark = field.name;
                    break;
                case 'Print on Demand Publication':
                    mappings.printOnDemand = field.name;
                    break;
                case 'Copyright':
                    mappings.copyright = field.name;
                    break;
                    
                // Marketing services
                case 'Amazon Bestseller Campaign Free eBook 1 Guaranteed':
                    mappings.bestsellerCampaignFree = field.name;
                    break;
                case 'Amazon Bestseller Campaign Paid eBook Top 100 Guaranteed':
                    mappings.bestsellerCampaignPaid = field.name;
                    break;
                case 'Barnes Noble Bestseller Campaign Paid eBook Top 100 Guaranteed':
                    mappings.barnesNobleBestseller = field.name;
                    break;
                case 'Author Website':
                    mappings.authorWebsite = field.name;
                    break;
                case 'Author Website Premium':
                    mappings.authorWebsitePremium = field.name;
                    break;
                case 'Press Release on the AP Newswire':
                    mappings.pressRelease = field.name;
                    break;
                case 'Author Wiki Page':
                    mappings.authorWikiPage = field.name;
                    break;
                    
                // Bestseller campaign tiers
                case 'Bronze one campaign':
                    mappings.bronzeCampaign = field.name;
                    break;
                case 'Silver four campaigns':
                    mappings.silverCampaign = field.name;
                    break;
                case 'Gold six campaigns':
                    mappings.goldCampaign = field.name;
                    break;
                    
                // Sales boost options
                case '250 guaranteed book sales':
                    mappings.salesBoost250 = field.name;
                    break;
                case '500 guaranteed book sales':
                    mappings.salesBoost500 = field.name;
                    break;
                case '750 guaranteed book sales':
                    mappings.salesBoost750 = field.name;
                    break;
                case '1000 guaranteed book sales':
                    mappings.salesBoost1000 = field.name;
                    break;
                    
                // Additional services
                case 'Audiobook Production Publication excluding narration fees':
                    mappings.audiobookProduction = field.name;
                    break;
                case 'Book Video Trailer Service':
                    mappings.bookVideoTrailer = field.name;
                    break;
                case 'Marketing Images 20 universal use ie website social media':
                    mappings.marketingImages = field.name;
                    break;
                case 'Editorial Review The Book Revue':
                    mappings.editorialReview = field.name;
                    break;
                case 'Interview on American Real Talk Show after book release':
                    mappings.interviewShow = field.name;
                    break;
                    
                // Other fields
                case 'of Interior Images':
                    mappings.interiorImages = field.name;
                    break;
                case 'AIgenerated indicate scope here':
                    mappings.aiGenerated = field.name;
                    break;
                case 'Is there an existing Amazon listing If so note URL':
                    mappings.existingAmazonListing = field.name;
                    break;
            }
        });

        return mappings;
    }
}

// Export for use in other modules
window.PDFAnalyzer = PDFAnalyzer;