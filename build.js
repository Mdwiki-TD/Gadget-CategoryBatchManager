/**
 * Build script for Vue-based Category Batch Manager gadget
 * Concatenates all Vue source files into a single bundle for Wikimedia Commons
 */

const fs = require('fs');
const path = require('path');

// File order according to dependency requirements
const SOURCE_FILES = [
    'src/utils/Constants.js',
    'src/utils/ChangeCalculator.js',
    'src/utils/RateLimiter.js',
    'src/utils/Validator.js',
    'src/utils/WikitextParser.js',

    'src/models/FileModel.js',

    'src/services/APIService.js',
    'src/services/BatchProcessor.js',
    'src/services/CategoryService.js',
    'src/services/SearchService.js',

    'src/ui/components/CategoryLookup.js',
    'src/ui/components/PreviewTable.js',
    'src/ui/components/ProgressBar.js',
    'src/ui/components/Tab.js',
    'src/ui/components/Tabs.js',

    'src/ui/panels/CategoryInputsPanel.js',
    'src/ui/panels/ExecutePanel.js',
    'src/ui/panels/FilesListPanel.js',
    'src/ui/panels/MessageDisplayPanel.js',
    'src/ui/panels/PreviewPanel.js',
    'src/ui/panels/ReportsPanel.js',
    'src/ui/panels/SearchPanel.js',

    'src/ui/handlers/CategoryInputsHandler.js',
    'src/ui/handlers/ExecuteHandler.js',
    'src/ui/handlers/ProgressHandler.js',
    'src/ui/handlers/SearchHandler.js',

    'src/ui/helpers/ChangesHelper.js',
    'src/ui/helpers/ValidationHelper.js',

    'src/BatchManagerWrappers.js',
    'src/BatchManager.js',
    'src/gadget-entry.js',
];

const CSS_SOURCES = [
    'src/ui/styles/main.css',
    'src/ui/styles/PreviewDialog.css'
];

const DIST_DIR = 'dist';
// const OUTPUT_JS = 'dist/test3.js';
// const OUTPUT_CSS = 'dist/test3.css';

const OUTPUT_JS = 'dist/test4.js';
const OUTPUT_CSS = 'dist/test4.css';

/**
 * Strip module.exports blocks from JavaScript code
 * @param {string} code - The JavaScript code
 * @returns {string} Code with module.exports blocks removed
 */
function stripModuleExports(code) {
    // Remove blocks like:
    // (// @ts-ignore)
    code = code.replace(/\/\/\s*@ts-ignore/g, '');

    // Remove blocks like:
    // export default BatchManager;
    code = code.replace(/export [^;\n]+;\n?/g, '');
    code = code.replace(/export default [^;\n]+;\n?/g, '');

    // Remove blocks like:
    // import { CategoryInputsPanel, ExecutePanel, FilesListPanel, MessageDisplayPanel, PreviewPanel, SearchPanel } from './ui/panels';
    code = code.replace(/import [^;]+ from ['"][^'"]+['"];\n?/g, '');
    return code;
}

/**
 * Strip global comments from JavaScript code
 * @param {string} code - The JavaScript code
 * @returns {string} Code with global comments removed
 */
function stripGlobalComments(code) {
    // Use [\s\S] to match content across lines
    return code.replace(/\/\* global [\s\S]+? *\n?\*\/\n?/g, '');
}

/**
 * Process a single JavaScript file
 * @param {string} filePath - Path to the file
 * @returns {string} Processed file content with header comment
 */
function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Strip module.exports blocks
    content = stripModuleExports(content);

    // Strip global comments
    content = stripGlobalComments(content);

    // Trim trailing whitespace and ensure proper ending
    content = content.trim();

    // Add file marker comment
    const marker = `// === ${filePath} ===\n`;

    return marker + content;
}

/**
 * Generate the header comment for the bundled file
 * @returns {string} Header comment block
 */
function generateHeader() {
    return `/**
 * Gadget-CategoryBatchManager.js (Vue-based)
 * Category Batch Manager for Wikimedia Commons
 *
 * @version 1.0.0
 * @license MIT
 * @description A tool for batch categorization of files in Wikimedia Commons.
 *              Built with Vue.js and Wikimedia Codex.
 *
 * Built from: https://github.com/Mdwiki-TD/Gadget-CategoryBatchManager
 */
// <nowiki>

`;
}

/**
 * Generate the footer comment for the bundled file
 * @returns {string} Footer comment block
 */
function generateFooter() {
    return `
// </nowiki>
`;
}

/**
 * Build the bundled JavaScript file
 */
function buildJS() {
    console.log('Building Vue JavaScript bundle...');

    // Process all source files
    const processedFiles = SOURCE_FILES.map(processFile);

    // Combine all processed files
    const combinedContent = processedFiles.join('\n\n');

    // Create the bundle with header and footer
    const bundle = generateHeader() + combinedContent + generateFooter();

    // Write output file
    fs.writeFileSync(OUTPUT_JS, bundle, 'utf8');
    console.log(`✓ Created ${OUTPUT_JS}`);
}

/**
 * Copy CSS file to dist
 */
function buildCSS() {
    console.log('Copying CSS files...');
    let combinedCSS = '';
    CSS_SOURCES.forEach((cssSource) => {
        const cssContent = fs.readFileSync(cssSource, 'utf8');
        combinedCSS += cssContent + '\n';
    });
    fs.writeFileSync(OUTPUT_CSS, combinedCSS, 'utf8');
    console.log(`✓ Created ${OUTPUT_CSS}`);
}

/**
 * Main build function
 */
function build() {
    // Create dist directory if it doesn't exist
    if (!fs.existsSync(DIST_DIR)) {
        fs.mkdirSync(DIST_DIR, { recursive: true });
        console.log(`✓ Created ${DIST_DIR}/ directory`);
    }

    // Build JS
    buildJS();
    buildCSS();

    console.log('\nVue build completed successfully!');
}

// Run the build
build();
