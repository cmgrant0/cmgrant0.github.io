class FormFiller {
    constructor(pdfAnalyzer) {
        this.pdfAnalyzer = pdfAnalyzer;
        this.currentFormData = {};
    }

    // Fill form fields with provided data
    async fillForm(formData) {
        if (!this.pdfAnalyzer.getCurrentPDF()) {
            throw new Error('No PDF loaded');
        }

        try {
            // Get a copy of the current PDF
            const pdfDoc = await PDFLib.PDFDocument.load(
                await this.pdfAnalyzer.getCurrentPDF().save()
            );
            
            const form = pdfDoc.getForm();
            this.currentFormData = { ...formData };

            // Fill each field
            for (const [fieldName, value] of Object.entries(formData)) {
                try {
                    const field = form.getField(fieldName);
                    
                    if (field.constructor.name === 'PDFTextField') {
                        field.setText(String(value));
                    } else if (field.constructor.name === 'PDFCheckBox') {
                        if (value) {
                            field.check();
                        } else {
                            field.uncheck();
                        }
                    } else if (field.constructor.name === 'PDFDropdown') {
                        field.select(String(value));
                    } else if (field.constructor.name === 'PDFRadioGroup') {
                        field.select(String(value));
                    }
                } catch (fieldError) {
                    console.warn(`Could not fill field ${fieldName}:`, fieldError);
                }
            }

            return pdfDoc;
        } catch (error) {
            console.error('Form filling error:', error);
            throw error;
        }
    }

    // Generate and download filled PDF
    async downloadFilledPDF(formData, filename = 'filled-form.pdf') {
        try {
            const filledPDF = await this.fillForm(formData);
            const pdfBytes = await filledPDF.save();
            
            // Create download link
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the URL object
            URL.revokeObjectURL(url);
            
            return { success: true };
        } catch (error) {
            console.error('Download error:', error);
            return { success: false, error: error.message };
        }
    }

    // Preview filled form (for display purposes)
    createFormPreview(formData, fields) {
        const preview = [];
        
        // Show what will be filled
        for (const [fieldName, value] of Object.entries(formData)) {
            const field = fields.find(f => f.name === fieldName);
            if (field) {
                preview.push({
                    fieldName: field.name,
                    fieldType: field.type,
                    value: value,
                    filled: true
                });
            }
        }
        
        // Show empty fields
        for (const field of fields) {
            if (!formData.hasOwnProperty(field.name)) {
                preview.push({
                    fieldName: field.name,
                    fieldType: field.type,
                    value: field.value || '',
                    filled: false
                });
            }
        }
        
        return preview.sort((a, b) => a.fieldName.localeCompare(b.fieldName));
    }

    // Display preview in UI
    displayPreview(previewData, containerId) {
        const container = document.getElementById(containerId);
        
        if (previewData.length === 0) {
            container.innerHTML = '<p class="no-preview">No form data to preview</p>';
            return;
        }

        const previewHTML = previewData.map(item => `
            <div class="preview-item ${item.filled ? 'filled' : 'empty'}">
                <div class="field-info">
                    <div class="field-name">${item.fieldName}</div>
                    <div class="field-type">Type: ${item.fieldType}</div>
                    <div class="field-value">
                        ${item.filled ? 
                            `<strong>Will be filled:</strong> ${this.formatValue(item.value)}` : 
                            `<em>Will remain empty</em>`
                        }
                    </div>
                </div>
                <div class="fill-status">
                    ${item.filled ? '✓' : '○'}
                </div>
            </div>
        `).join('');

        container.innerHTML = previewHTML;
    }

    // Format values for display
    formatValue(value) {
        if (typeof value === 'boolean') {
            return value ? 'Checked' : 'Unchecked';
        } else if (typeof value === 'string' && value.length > 50) {
            return value.substring(0, 50) + '...';
        } else {
            return String(value);
        }
    }

    // Get statistics about the form filling
    getFillingStats(formData, totalFields) {
        const filledCount = Object.keys(formData).length;
        const emptyCount = totalFields - filledCount;
        const fillPercentage = totalFields > 0 ? (filledCount / totalFields * 100).toFixed(1) : 0;

        return {
            totalFields,
            filledFields: filledCount,
            emptyFields: emptyCount,
            fillPercentage: fillPercentage + '%'
        };
    }

    // Validate form data before filling
    validateFormData(formData, fields) {
        const errors = [];
        const warnings = [];

        for (const [fieldName, value] of Object.entries(formData)) {
            const field = fields.find(f => f.name === fieldName);
            
            if (!field) {
                errors.push(`Field "${fieldName}" not found in PDF`);
                continue;
            }

            // Type-specific validation
            if (field.type === 'Text' && typeof value !== 'string') {
                warnings.push(`Field "${fieldName}" expects text but got ${typeof value}`);
            } else if (field.type === 'CheckBox' && typeof value !== 'boolean') {
                warnings.push(`Field "${fieldName}" expects boolean but got ${typeof value}`);
            } else if (field.type === 'Dropdown' && field.options && !field.options.includes(String(value))) {
                warnings.push(`Field "${fieldName}" value "${value}" not in available options: ${field.options.join(', ')}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    // Clear current form data
    clearFormData() {
        this.currentFormData = {};
    }

    // Get current form data
    getCurrentFormData() {
        return { ...this.currentFormData };
    }

    // Merge new data with existing
    mergeFormData(newData) {
        this.currentFormData = { ...this.currentFormData, ...newData };
        return this.currentFormData;
    }
}

// Export for use in other modules
window.FormFiller = FormFiller;