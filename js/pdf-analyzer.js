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

    // Smart field mapping for common patterns
    getFieldMappings() {
        const mappings = {};
        
        this.formFields.forEach(field => {
            const name = field.name.toLowerCase();
            
            // Map common field patterns
            if (name.includes('client') && name.includes('name')) {
                mappings.clientName = field.name;
            } else if (name.includes('book') && name.includes('title')) {
                mappings.bookTitle = field.name;
            } else if (name.includes('email')) {
                mappings.email = field.name;
            } else if (name.includes('phone')) {
                mappings.phone = field.name;
            } else if (name.includes('word') && name.includes('count')) {
                mappings.wordCount = field.name;
            } else if (name.includes('nonfiction') && name.includes('manuscript')) {
                mappings.nonfictionManuscript = field.name;
            } else if (name.includes('fiction') && name.includes('manuscript')) {
                mappings.fictionManuscript = field.name;
            } else if (name.includes('proofreading') && name.includes('only')) {
                mappings.proofreadingOnly = field.name;
            } else if (name.includes('developmental') && name.includes('editing')) {
                mappings.developmentalEditing = field.name;
            } else if (name.includes('line') && name.includes('editing')) {
                mappings.lineEditing = field.name;
            } else if (name.includes('copy') && name.includes('editing')) {
                mappings.copyEditing = field.name;
            }
        });

        return mappings;
    }
}

// Export for use in other modules
window.PDFAnalyzer = PDFAnalyzer;