# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
AR Press PDF Form Automation Tool - A client-side web application that automates PDF form filling using natural language processing. Specifically optimized for Author Services Plan documents, extracting client information from unstructured text and mapping it to PDF form fields.

## Development Setup
- **No build process required** - Static HTML/CSS/JS files served directly
- **Dependencies**: PDF-lib loaded via CDN (https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js)
- **Testing**: Open `test.html` for PDF field analysis utility
- **Deployment**: Any static web server (no server-side processing needed)

## Architecture
Modular JavaScript with ES6 classes and window-based exports:

- **main.js** - Application controller, handles UI coordination and file workflow
- **pdf-analyzer.js** - PDF form field extraction using PDF-lib, template creation
- **nlp-processor.js** - Rule-based NLP with regex patterns for data extraction
- **form-filler.js** - PDF form population, validation, and file generation
- **preset-manager.js** - localStorage-based template persistence (CRUD operations)
- **debug-logger.js** - Comprehensive logging system with categorization and UI

## Data Flow
1. PDF Upload → Field Analysis → Template Creation
2. Author Info Input → NLP Processing → Field Mapping
3. Form Filling → Validation → PDF Generation

## Key Technical Decisions
- **Client-side only**: Complete PDF processing in browser for privacy
- **Rule-based NLP**: Regex patterns instead of ML for predictable results
- **No build system**: Direct ES6 modules with CDN dependencies
- **localStorage persistence**: Templates saved locally with JSON serialization

## Field Mapping System
The application uses intelligent field mapping between extracted client data and PDF form fields:
- Uses `currentMappings` object to map NLP-extracted data to PDF field names
- Supports TextField, CheckBox, Dropdown, RadioGroup field types
- Template system allows reuse of field mappings across similar forms

## Debug System
Comprehensive logging with categories (APP_INIT, FILE_UPLOAD, PDF_ANALYSIS, NLP_PROCESSING, etc.):
- Multi-level logging (debug, info, warn, error)
- Performance timing utilities
- Debug UI with export capabilities
- Field analysis diagnostic tools

## Modified Files Status
Current working directory has modifications to:
- `js/nlp-processor.js` - NLP processing improvements
- `js/pdf-analyzer.js` - PDF analysis enhancements