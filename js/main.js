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
        
        // Initialize preset selector
        this.presetManager.updatePresetSelector();
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
        if (file.type !== 'application/pdf') {
            this.showUploadStatus('Please select a PDF file', 'error');
            return;
        }

        this.showLoading('Analyzing PDF form fields...');
        
        try {
            const result = await this.pdfAnalyzer.analyzePDF(file);
            
            if (result.success) {
                this.currentFields = result.fields;
                this.currentMappings = this.pdfAnalyzer.getFieldMappings();
                
                this.showUploadStatus(`✓ Found ${result.fieldCount} form fields`, 'success');
                this.pdfAnalyzer.displayFields('fieldsContainer');
                
                // Enable template saving
                document.getElementById('saveTemplate').disabled = false;
                document.getElementById('parseInfo').disabled = false;
                
            } else {
                this.showUploadStatus(`Error: ${result.error}`, 'error');
            }
        } catch (error) {
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
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.pdfFormApp = new PDFFormApp();
});