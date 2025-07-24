class DebugLogger {
    constructor() {
        this.logs = [];
        this.startTime = Date.now();
        this.debugMode = true; // Set to false to disable logging
        this.maxLogs = 1000; // Prevent memory issues
    }

    log(level, category, message, data = null) {
        if (!this.debugMode) return;

        const timestamp = Date.now() - this.startTime;
        const logEntry = {
            timestamp,
            level,
            category,
            message,
            data: data ? JSON.parse(JSON.stringify(data)) : null, // Deep clone to prevent reference issues
            time: new Date().toISOString()
        };

        this.logs.push(logEntry);
        
        // Limit log size
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // Console output with formatting
        const consoleMsg = `[${timestamp}ms] ${category.toUpperCase()}: ${message}`;
        
        switch (level) {
            case 'error':
                console.error(consoleMsg, data);
                break;
            case 'warn':
                console.warn(consoleMsg, data);
                break;
            case 'info':
                console.info(consoleMsg, data);
                break;
            case 'debug':
                console.debug(consoleMsg, data);
                break;
            default:
                console.log(consoleMsg, data);
        }

        // Update debug UI if it exists
        this.updateDebugUI();
    }

    // Convenience methods for different log levels
    error(category, message, data) {
        this.log('error', category, message, data);
    }

    warn(category, message, data) {
        this.log('warn', category, message, data);
    }

    info(category, message, data) {
        this.log('info', category, message, data);
    }

    debug(category, message, data) {
        this.log('debug', category, message, data);
    }

    // PDF-specific logging methods
    logPDFAnalysis(fieldCount, fields) {
        this.info('PDF_ANALYSIS', `Found ${fieldCount} form fields`, { 
            fieldCount, 
            fieldNames: fields.map(f => f.name),
            fieldTypes: fields.map(f => ({ name: f.name, type: f.type }))
        });
    }

    logFieldMapping(mappings) {
        this.info('FIELD_MAPPING', `Created ${Object.keys(mappings).length} field mappings`, mappings);
    }

    logNLPExtraction(extractedData) {
        this.info('NLP_EXTRACTION', 'Extracted data from natural language', extractedData);
    }

    logFormDataMapping(formData) {
        this.info('FORM_DATA', `Mapped ${Object.keys(formData).length} form fields`, formData);
    }

    logPDFGeneration(success, error = null) {
        if (success) {
            this.info('PDF_GENERATION', 'PDF generation completed successfully');
        } else {
            this.error('PDF_GENERATION', 'PDF generation failed', { error: error?.message || error });
        }
    }

    logFieldFilling(fieldName, value, success, error = null) {
        if (success) {
            this.debug('FIELD_FILLING', `Successfully filled field: ${fieldName}`, { fieldName, value });
        } else {
            this.warn('FIELD_FILLING', `Failed to fill field: ${fieldName}`, { 
                fieldName, 
                value, 
                error: error?.message || error 
            });
        }
    }

    // Get logs by category
    getLogsByCategory(category) {
        return this.logs.filter(log => log.category === category);
    }

    // Get logs by level
    getLogsByLevel(level) {
        return this.logs.filter(log => log.level === level);
    }

    // Get recent logs
    getRecentLogs(count = 50) {
        return this.logs.slice(-count);
    }

    // Clear all logs
    clearLogs() {
        this.logs = [];
        this.startTime = Date.now();
        this.updateDebugUI();
        this.info('SYSTEM', 'Debug logs cleared');
    }

    // Export logs as JSON
    exportLogs() {
        const exportData = {
            exported: new Date().toISOString(),
            sessionDuration: Date.now() - this.startTime,
            logCount: this.logs.length,
            logs: this.logs
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
            type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `pdf-form-debug-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        this.info('SYSTEM', 'Debug logs exported');
    }

    // Generate debug report
    generateReport() {
        const errors = this.getLogsByLevel('error');
        const warnings = this.getLogsByLevel('warn');
        const pdfLogs = this.getLogsByCategory('PDF_GENERATION');
        const fieldLogs = this.getLogsByCategory('FIELD_FILLING');

        return {
            summary: {
                totalLogs: this.logs.length,
                errors: errors.length,
                warnings: warnings.length,
                sessionDuration: Date.now() - this.startTime
            },
            errors: errors,
            warnings: warnings,
            pdfGeneration: pdfLogs,
            fieldFilling: fieldLogs,
            recentActivity: this.getRecentLogs(20)
        };
    }

    // Update debug UI panel
    updateDebugUI() {
        const debugPanel = document.getElementById('debugPanel');
        if (!debugPanel || !debugPanel.style.display !== 'none') return;

        const logContainer = document.getElementById('debugLogs');
        if (!logContainer) return;

        const recentLogs = this.getRecentLogs(10);
        const logsHTML = recentLogs.map(log => {
            const levelClass = `debug-${log.level}`;
            const timeStr = (log.timestamp / 1000).toFixed(2) + 's';
            
            return `
                <div class="debug-log-entry ${levelClass}">
                    <span class="debug-time">${timeStr}</span>
                    <span class="debug-category">[${log.category}]</span>
                    <span class="debug-message">${log.message}</span>
                    ${log.data ? `<pre class="debug-data">${JSON.stringify(log.data, null, 2)}</pre>` : ''}
                </div>
            `;
        }).join('');

        logContainer.innerHTML = logsHTML;

        // Update stats
        const statsEl = document.getElementById('debugStats');
        if (statsEl) {
            const stats = this.generateReport().summary;
            statsEl.innerHTML = `
                <div class="debug-stat">Logs: ${stats.totalLogs}</div>
                <div class="debug-stat">Errors: ${stats.errors}</div>
                <div class="debug-stat">Warnings: ${stats.warnings}</div>
                <div class="debug-stat">Runtime: ${(stats.sessionDuration / 1000).toFixed(1)}s</div>
            `;
        }
    }

    // Performance timing
    startTimer(name) {
        this.debug('PERFORMANCE', `Timer started: ${name}`);
        return {
            name,
            start: performance.now(),
            end: () => {
                const duration = performance.now() - this.start;
                this.debug('PERFORMANCE', `Timer ${name}: ${duration.toFixed(2)}ms`);
                return duration;
            }
        };
    }

    // Log system information
    logSystemInfo() {
        const info = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            screen: {
                width: screen.width,
                height: screen.height,
                colorDepth: screen.colorDepth
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };
        
        this.info('SYSTEM', 'System information logged', info);
        return info;
    }

    // Enable/disable debug mode
    setDebugMode(enabled) {
        this.debugMode = enabled;
        this.info('SYSTEM', `Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }
}

// Create global debug logger instance
window.debugLogger = new DebugLogger();

// Log system info on startup
window.debugLogger.logSystemInfo();
window.debugLogger.info('SYSTEM', 'Debug logger initialized');

// Export for use in other modules
window.DebugLogger = DebugLogger;