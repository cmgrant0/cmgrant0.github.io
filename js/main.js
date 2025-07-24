// Main application controller
class PDFFormApp {
    constructor() {
        this.pdfAnalyzer = new PDFAnalyzer();
        this.presetManager = new PresetManager();
        this.nlpProcessor = new NLPProcessor();
        this.formFiller = new FormFiller(this.pdfAnalyzer);
        
        this.currentFields = [];
        this.currentMappings = {};
        
        this.initializeUI();
    }

    initializeUI() {
        // PDF upload handling
        this.setupFileUpload();
        
        // Template management
        this.setupTemplateManagement();
        
        // Author info processing
        this.setupAuthorInfoProcessing();
        
        // Download functionality
        this.setupDownload();
        
        // Debug controls
        this.setupDebugControls();
        
        // Initialize preset selector
        this.presetManager.updatePresetSelector();
        
        // Log initialization
        window.debugLogger.info('APP_INIT', 'PDF Form App initialized successfully');
    }

    setupFileUpload() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('pdfInput');
        const uploadStatus = document.getElementById('uploadStatus');

        // Click to upload
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileUpload(files[0]);
            }
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0]);
            }
        });
    }

    async handleFileUpload(file) {
        const logger = window.debugLogger;
        logger.info('FILE_UPLOAD', `Processing file upload: ${file.name}`, {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            lastModified: new Date(file.lastModified).toISOString()
        });

        if (file.type !== 'application/pdf') {
            const error = 'Please select a PDF file';
            logger.warn('FILE_UPLOAD', error, { actualType: file.type });
            this.showUploadStatus(error, 'error');
            return;
        }

        this.showLoading('Analyzing PDF form fields...');
        const uploadTimer = logger.startTimer('PDF_ANALYSIS');
        
        try {
            const result = await this.pdfAnalyzer.analyzePDF(file);
            
            if (result.success) {
                this.currentFields = result.fields;
                this.currentMappings = this.pdfAnalyzer.getFieldMappings();
                
                logger.logPDFAnalysis(result.fieldCount, result.fields);
                logger.logFieldMapping(this.currentMappings);
                
                this.showUploadStatus(`✓ Found ${result.fieldCount} form fields`, 'success');
                this.pdfAnalyzer.displayFields('fieldsContainer');
                
                // Enable template saving
                document.getElementById('saveTemplate').disabled = false;
                document.getElementById('parseInfo').disabled = false;
                
                uploadTimer.end();
                logger.info('FILE_UPLOAD', 'PDF analysis completed successfully');
                
            } else {
                logger.error('FILE_UPLOAD', 'PDF analysis failed', { error: result.error });
                this.showUploadStatus(`Error: ${result.error}`, 'error');
            }
        } catch (error) {
            uploadTimer.end();
            logger.error('FILE_UPLOAD', 'Critical error during PDF analysis', {
                error: error.message,
                stack: error.stack
            });
            this.showUploadStatus(`Error analyzing PDF: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }

    setupTemplateManagement() {
        const saveButton = document.getElementById('saveTemplate');
        const loadButton = document.getElementById('loadTemplate');
        const templateName = document.getElementById('templateName');
        const templateSelect = document.getElementById('templateSelect');

        // Save template
        saveButton.addEventListener('click', () => {
            const name = templateName.value.trim();
            
            if (!name) {
                alert('Please enter a template name');
                return;
            }

            if (this.currentFields.length === 0) {
                alert('Please upload and analyze a PDF first');
                return;
            }

            const template = this.pdfAnalyzer.createTemplate(name);
            const result = this.presetManager.savePreset(name, template);

            if (result.success) {
                templateName.value = '';
                alert(`Template "${name}" saved successfully!`);
            } else {
                alert(`Error saving template: ${result.error}`);
            }
        });

        // Load template
        loadButton.addEventListener('click', () => {
            const presetId = templateSelect.value;
            
            if (!presetId) {
                alert('Please select a template to load');
                return;
            }

            const result = this.presetManager.loadPreset(presetId);
            
            if (result.success) {
                // Simulate having analyzed a PDF with these fields
                this.currentFields = result.preset.fields.map(field => ({
                    ...field,
                    value: null // Reset values
                }));
                
                this.pdfAnalyzer.formFields = this.currentFields;
                this.currentMappings = this.pdfAnalyzer.getFieldMappings();
                
                this.pdfAnalyzer.displayFields('fieldsContainer');
                this.showUploadStatus(`✓ Loaded template "${result.preset.name}"`, 'success');
                
                // Enable functionality
                document.getElementById('parseInfo').disabled = false;
                
            } else {
                alert(`Error loading template: ${result.error}`);
            }
        });

        // Enable load button when selection changes
        templateSelect.addEventListener('change', () => {
            loadButton.disabled = !templateSelect.value;
        });
    }

    setupAuthorInfoProcessing() {
        const parseButton = document.getElementById('parseInfo');
        const authorTextarea = document.getElementById('authorInfo');

        parseButton.addEventListener('click', () => {
            const authorText = authorTextarea.value.trim();
            
            if (!authorText) {
                alert('Please enter author information');
                return;
            }

            if (this.currentFields.length === 0) {
                alert('Please upload and analyze a PDF first');
                return;
            }

            this.showLoading('Processing author information...');

            try {
                // Extract data from natural language
                const extractedData = this.nlpProcessor.parseAuthorInfo(authorText);
                
                // Map to form fields
                const formData = this.nlpProcessor.mapToFormFields(extractedData, this.currentMappings);
                
                // Create preview
                const preview = this.formFiller.createFormPreview(formData, this.currentFields);
                this.formFiller.displayPreview(preview, 'previewContainer');
                
                // Store form data for download
                this.formFiller.mergeFormData(formData);
                
                // Enable download
                document.getElementById('downloadPDF').disabled = false;
                
                // Show stats
                const stats = this.formFiller.getFillingStats(formData, this.currentFields.length);
                console.log('Form filling statistics:', stats);
                
            } catch (error) {
                alert(`Error processing author information: ${error.message}`);
            } finally {
                this.hideLoading();
            }
        });
    }

    setupDownload() {
        const downloadButton = document.getElementById('downloadPDF');
        
        downloadButton.addEventListener('click', async () => {
            const formData = this.formFiller.getCurrentFormData();
            
            if (Object.keys(formData).length === 0) {
                alert('No form data to download. Please parse author information first.');
                return;
            }

            this.showLoading('Generating PDF...');

            try {
                // Generate filename based on extracted data
                const clientName = formData[this.currentMappings.clientName] || 'Author';
                const timestamp = new Date().toISOString().split('T')[0];
                const filename = `${clientName.replace(/\s+/g, '-')}-Services-Plan-${timestamp}.pdf`;
                
                const result = await this.formFiller.downloadFilledPDF(formData, filename);
                
                if (result.success) {
                    // Success feedback could be shown here
                    console.log('PDF downloaded successfully');
                } else {
                    alert(`Error generating PDF: ${result.error}`);
                }
            } catch (error) {
                alert(`Error downloading PDF: ${error.message}`);
            } finally {
                this.hideLoading();
            }
        });
    }

    // UI Helper Methods
    showUploadStatus(message, type = 'info') {
        const status = document.getElementById('uploadStatus');
        status.textContent = message;
        status.className = `upload-status ${type}`;
        status.style.display = 'block';
    }

    showLoading(message = 'Processing...') {
        const overlay = document.getElementById('loadingOverlay');
        const text = document.getElementById('loadingText');
        text.textContent = message;
        overlay.classList.add('show');
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        overlay.classList.remove('show');
    }

    setupDebugControls() {
        const toggleDebugBtn = document.getElementById('toggleDebug');
        const exportLogsBtn = document.getElementById('exportLogs');
        const clearLogsBtn = document.getElementById('clearLogs');
        const analyzeFieldsBtn = document.getElementById('analyzeFields');
        const debugPanel = document.getElementById('debugPanel');

        // Toggle debug panel
        toggleDebugBtn.addEventListener('click', () => {
            const isVisible = debugPanel.style.display !== 'none';
            
            if (isVisible) {
                debugPanel.style.display = 'none';
                toggleDebugBtn.textContent = '🐛 Show Debug Panel';
            } else {
                debugPanel.style.display = 'block';
                debugPanel.classList.add('show');
                toggleDebugBtn.textContent = '🐛 Hide Debug Panel';
                window.debugLogger.updateDebugUI();
            }
            
            window.debugLogger.info('DEBUG_UI', `Debug panel ${isVisible ? 'hidden' : 'shown'}`);
        });

        // Export logs
        exportLogsBtn.addEventListener('click', () => {
            window.debugLogger.exportLogs();
        });

        // Clear logs
        clearLogsBtn.addEventListener('click', () => {
            if (confirm('Clear all debug logs?')) {
                window.debugLogger.clearLogs();
            }
        });

        // Analyze fields (diagnostic tool)
        analyzeFieldsBtn.addEventListener('click', () => {
            this.analyzeCurrentFields();
        });
    }

    analyzeCurrentFields() {
        const logger = window.debugLogger;
        
        if (this.currentFields.length === 0) {
            logger.warn('FIELD_ANALYSIS', 'No PDF fields available for analysis');
            alert('Please upload and analyze a PDF first');
            return;
        }

        logger.info('FIELD_ANALYSIS', 'Starting detailed field analysis');

        // Analyze field types
        const fieldTypes = {};
        this.currentFields.forEach(field => {
            fieldTypes[field.type] = (fieldTypes[field.type] || 0) + 1;
        });

        // Analyze field mappings
        const mappedFields = Object.keys(this.currentMappings).length;
        const unmappedFields = this.currentFields.length - mappedFields;

        // Check for potential issues
        const issues = [];
        this.currentFields.forEach(field => {
            if (field.name.includes('undefined')) {
                issues.push(`Undefined field name: ${field.name}`);
            }
            if (field.type === 'r' || field.type === 'e') {
                issues.push(`Unusual field type "${field.type}" for field: ${field.name}`);
            }
        });

        const analysis = {
            totalFields: this.currentFields.length,
            fieldTypes,
            mappedFields,
            unmappedFields,
            issues,
            fieldNames: this.currentFields.map(f => f.name),
            mappings: this.currentMappings
        };

        logger.info('FIELD_ANALYSIS', 'Field analysis completed', analysis);

        // Show summary
        const summary = `
Field Analysis Summary:
- Total Fields: ${analysis.totalFields}
- Mapped Fields: ${analysis.mappedFields}
- Unmapped Fields: ${analysis.unmappedFields}
- Field Types: ${Object.entries(fieldTypes).map(([type, count]) => `${type}(${count})`).join(', ')}
- Issues Found: ${issues.length}

Check console/debug logs for detailed information.
        `;

        alert(summary.trim());
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.pdfFormApp = new PDFFormApp();
});