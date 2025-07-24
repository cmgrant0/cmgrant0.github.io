class FormFiller {
    constructor(pdfAnalyzer) {
        this.pdfAnalyzer = pdfAnalyzer;
        this.currentFormData = {};
    }

    // Fill form fields with provided data
    async fillForm(formData) {
        const logger = window.debugLogger;
        logger.info('FORM_FILLING', 'Starting PDF form filling process');
        
        if (!this.pdfAnalyzer.getCurrentPDF()) {
            const error = new Error('No PDF loaded');
            logger.error('FORM_FILLING', 'No PDF document available', { error: error.message });
            throw error;
        }

        logger.logFormDataMapping(formData);
        const timer = logger.startTimer('PDF_FORM_FILLING');

        try {
            // Get a copy of the current PDF
            logger.debug('FORM_FILLING', 'Creating copy of PDF document');
            const originalPDFBytes = await this.pdfAnalyzer.getCurrentPDF().save();
            const pdfDoc = await PDFLib.PDFDocument.load(originalPDFBytes);
            
            logger.debug('FORM_FILLING', 'PDF document loaded successfully', { 
                size: originalPDFBytes.length 
            });
            
            const form = pdfDoc.getForm();
            const availableFields = form.getFields();
            
            logger.debug('FORM_FILLING', `Found ${availableFields.length} form fields in PDF`, {
                fieldNames: availableFields.map(f => f.getName())
            });
            
            this.currentFormData = { ...formData };
            let successCount = 0;
            let failureCount = 0;

            // Fill each field with detailed logging
            for (const [fieldName, value] of Object.entries(formData)) {
                logger.debug('FIELD_FILLING', `Attempting to fill field: ${fieldName}`, { 
                    fieldName, 
                    value, 
                    valueType: typeof value 
                });

                try {
                    // Check if field exists
                    const field = form.getField(fieldName);
                    const fieldType = field.constructor.name;
                    
                    logger.debug('FIELD_FILLING', `Field found: ${fieldName}`, { 
                        fieldType,
                        isReadOnly: field.isReadOnly?.() || 'unknown'
                    });
                    
                    // Fill based on field type
                    if (fieldType === 'PDFTextField') {
                        const stringValue = String(value);
                        field.setText(stringValue);
                        logger.logFieldFilling(fieldName, stringValue, true);
                        successCount++;
                        
                    } else if (fieldType === 'PDFCheckBox') {
                        if (value) {
                            field.check();
                            logger.logFieldFilling(fieldName, 'checked', true);
                        } else {
                            field.uncheck();
                            logger.logFieldFilling(fieldName, 'unchecked', true);
                        }
                        successCount++;
                        
                    } else if (fieldType === 'PDFDropdown') {
                        const stringValue = String(value);
                        const options = field.getOptions();
                        
                        if (options.includes(stringValue)) {
                            field.select(stringValue);
                            logger.logFieldFilling(fieldName, stringValue, true);
                            successCount++;
                        } else {
                            logger.warn('FIELD_FILLING', `Value "${stringValue}" not in dropdown options`, {
                                fieldName,
                                value: stringValue,
                                availableOptions: options
                            });
                            failureCount++;
                        }
                        
                    } else if (fieldType === 'PDFRadioGroup') {
                        const stringValue = String(value);
                        const options = field.getOptions();
                        
                        if (options.includes(stringValue)) {
                            field.select(stringValue);
                            logger.logFieldFilling(fieldName, stringValue, true);
                            successCount++;
                        } else {
                            logger.warn('FIELD_FILLING', `Value "${stringValue}" not in radio options`, {
                                fieldName,
                                value: stringValue,
                                availableOptions: options
                            });
                            failureCount++;
                        }
                        
                    } else {
                        logger.warn('FIELD_FILLING', `Unsupported field type: ${fieldType}`, {
                            fieldName,
                            fieldType,
                            value
                        });
                        failureCount++;
                    }
                    
                } catch (fieldError) {
                    logger.logFieldFilling(fieldName, value, false, fieldError);
                    failureCount++;
                    
                    // Try to get more information about the error
                    const fieldExists = availableFields.some(f => f.getName() === fieldName);
                    if (!fieldExists) {
                        logger.error('FIELD_FILLING', `Field "${fieldName}" does not exist in PDF`, {
                            fieldName,
                            availableFields: availableFields.map(f => f.getName())
                        });
                    }
                }
            }

            const duration = timer.end();
            logger.info('FORM_FILLING', `Form filling completed`, {
                totalFields: Object.keys(formData).length,
                successful: successCount,
                failed: failureCount,
                duration: duration
            });

            return pdfDoc;
            
        } catch (error) {
            timer.end();
            logger.error('FORM_FILLING', 'Critical error during form filling', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    // Generate and download filled PDF
    async downloadFilledPDF(formData, filename = 'filled-form.pdf') {
        const logger = window.debugLogger;
        logger.info('PDF_DOWNLOAD', `Starting PDF download process: ${filename}`);
        
        const downloadTimer = logger.startTimer('PDF_DOWNLOAD');
        
        try {
            // Fill the form
            const filledPDF = await this.fillForm(formData);
            logger.debug('PDF_DOWNLOAD', 'Form filling completed, generating PDF bytes');
            
            // Generate PDF bytes
            const pdfBytes = await filledPDF.save();
            logger.debug('PDF_DOWNLOAD', `PDF bytes generated`, { 
                size: pdfBytes.length,
                sizeKB: Math.round(pdfBytes.length / 1024)
            });
            
            // Validate PDF bytes
            if (!pdfBytes || pdfBytes.length === 0) {
                throw new Error('Generated PDF is empty');
            }
            
            // Create download blob
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            logger.debug('PDF_DOWNLOAD', 'Created download blob and URL');
            
            // Create and trigger download
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            
            logger.debug('PDF_DOWNLOAD', `Triggering download: ${filename}`);
            link.click();
            
            // Cleanup
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            const duration = downloadTimer.end();
            logger.logPDFGeneration(true);
            logger.info('PDF_DOWNLOAD', `PDF download completed successfully`, {
                filename,
                fileSize: pdfBytes.length,
                duration
            });
            
            return { success: true, filename, fileSize: pdfBytes.length };
            
        } catch (error) {
            downloadTimer.end();
            logger.logPDFGeneration(false, error);
            logger.error('PDF_DOWNLOAD', 'PDF download failed', {
                filename,
                error: error.message,
                stack: error.stack
            });
            
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