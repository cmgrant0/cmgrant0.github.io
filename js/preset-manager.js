class PresetManager {
    constructor() {
        this.storageKey = 'pdf-form-presets';
        this.presets = this.loadPresets();
    }

    // Load presets from localStorage
    loadPresets() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Error loading presets:', error);
            return {};
        }
    }

    // Save presets to localStorage
    savePresets() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.presets));
            return true;
        } catch (error) {
            console.error('Error saving presets:', error);
            return false;
        }
    }

    // Save a new preset
    savePreset(name, template) {
        if (!name || !template) {
            return { success: false, error: 'Name and template are required' };
        }

        const presetId = this.generateId(name);
        this.presets[presetId] = {
            id: presetId,
            name: name,
            created: new Date().toISOString(),
            lastUsed: new Date().toISOString(),
            ...template
        };

        const saved = this.savePresets();
        if (saved) {
            this.updatePresetSelector();
            return { success: true, id: presetId };
        } else {
            return { success: false, error: 'Failed to save to localStorage' };
        }
    }

    // Load a preset by ID
    loadPreset(presetId) {
        if (!this.presets[presetId]) {
            return { success: false, error: 'Preset not found' };
        }

        // Update last used timestamp
        this.presets[presetId].lastUsed = new Date().toISOString();
        this.savePresets();

        return { 
            success: true, 
            preset: this.presets[presetId] 
        };
    }

    // Delete a preset
    deletePreset(presetId) {
        if (!this.presets[presetId]) {
            return { success: false, error: 'Preset not found' };
        }

        delete this.presets[presetId];
        const saved = this.savePresets();
        
        if (saved) {
            this.updatePresetSelector();
            return { success: true };
        } else {
            return { success: false, error: 'Failed to update localStorage' };
        }
    }

    // Get all presets
    getAllPresets() {
        return Object.values(this.presets).sort((a, b) => 
            new Date(b.lastUsed) - new Date(a.lastUsed)
        );
    }

    // Generate a unique ID for a preset
    generateId(name) {
        const timestamp = Date.now();
        const sanitized = name.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-');
        return `${sanitized}-${timestamp}`;
    }

    // Update the preset selector dropdown
    updatePresetSelector() {
        const selector = document.getElementById('templateSelect');
        if (!selector) return;

        // Clear existing options except the first one
        selector.innerHTML = '<option value="">Select saved template...</option>';

        const presets = this.getAllPresets();
        presets.forEach(preset => {
            const option = document.createElement('option');
            option.value = preset.id;
            option.textContent = `${preset.name} (${preset.fieldCount} fields)`;
            selector.appendChild(option);
        });

        // Enable/disable load button
        const loadButton = document.getElementById('loadTemplate');
        if (loadButton) {
            loadButton.disabled = presets.length === 0;
        }
    }

    // Export presets as JSON
    exportPresets() {
        const exportData = {
            version: '1.0',
            exported: new Date().toISOString(),
            presets: this.presets
        };
        return JSON.stringify(exportData, null, 2);
    }

    // Import presets from JSON
    importPresets(jsonData) {
        try {
            const importData = JSON.parse(jsonData);
            
            if (!importData.presets) {
                return { success: false, error: 'Invalid preset format' };
            }

            let importCount = 0;
            for (const [id, preset] of Object.entries(importData.presets)) {
                // Generate new ID to avoid conflicts
                const newId = this.generateId(preset.name);
                this.presets[newId] = {
                    ...preset,
                    id: newId,
                    imported: new Date().toISOString()
                };
                importCount++;
            }

            const saved = this.savePresets();
            if (saved) {
                this.updatePresetSelector();
                return { success: true, count: importCount };
            } else {
                return { success: false, error: 'Failed to save imported presets' };
            }
        } catch (error) {
            return { success: false, error: 'Invalid JSON format' };
        }
    }

    // Get preset statistics
    getStats() {
        const presets = Object.values(this.presets);
        return {
            total: presets.length,
            totalFields: presets.reduce((sum, preset) => sum + (preset.fieldCount || 0), 0),
            oldestPreset: presets.length > 0 ? 
                Math.min(...presets.map(p => new Date(p.created).getTime())) : null,
            newestPreset: presets.length > 0 ? 
                Math.max(...presets.map(p => new Date(p.created).getTime())) : null
        };
    }
}

// Export for use in other modules
window.PresetManager = PresetManager;