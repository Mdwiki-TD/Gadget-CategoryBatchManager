/**
 * Build script for Vue-based Category Batch Manager gadget
 * Concatenates all Vue source files into a single bundle for Wikimedia Commons
 */

const fs = require('fs');
const path = require('path');

// File order according to dependency requirements
const SOURCE_FILES = [
    'src/utils/Validator.js',
    'src/utils/RateLimiter.js',
    'src/utils/WikitextParser.js',
    'src/models/FileModel.js',
    'src/models/CategoryOperation.js',
    'src/services/APIService.js',
    'src/services/BatchProcessor.js',
    'src/services/CategoryService.js',
    'src/services/FileService.js',

    'src/ui/components/CategoryInputs.js',
    'src/ui/components/CategoryInputsMessages.js',
    'src/ui/components/FilesList.js',
    'src/ui/components/SearchProgressBar.js',
    'src/ui/components/MessageDisplay.js',

    'src/ui/handlers/ExecuteHandler.js',
    'src/ui/handlers/PreviewHandler.js',
    'src/ui/handlers/SearchHandler.js',

    'src/ui/helpers/ValidationHelper.js',

    'src/BatchManager.js',
    'src/gadget-entry.js',
];

const DIST_DIR = 'dist';
const OUTPUT_JS = 'dist/test2.js';

const CSS_SOURCE = 'src/ui/styles/main.css';
const OUTPUT_CSS = 'dist/test2.css';

/**
 * Strip module.exports blocks from JavaScript code
 * @param {string} code - The JavaScript code
 * @returns {string} Code with module.exports blocks removed
 */
function stripModuleExports(code) {
    // Remove blocks like:
    // if (typeof module !== 'undefined' && module.exports) {
    //   module.exports = ClassName;
    // }
    // Use [\s\S] instead of . to match across newlines
    code = code.replace(
        /if \(typeof module !== 'undefined' && module\.exports\) \{[\s\S]*?module\.exports = [^;]+;[\s\S]*?\}\n?/g,
        ''
    );
    // Remove blocks like:
    // module.exports = {
    //     BatchManager
    // };
    code = code.replace(/module\.exports = \{[\s\S]*?\};\n?/g, '');
    return code;
}

/**
 * Strip global comments from JavaScript code
 * @param {string} code - The JavaScript code
 * @returns {string} Code with global comments removed
 */
function stripGlobalComments(code) {
    // Use [\s\S] to match content across lines
    return code.replace(/\/\* global [\s\S]+? \*\/\n?/g, '');
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

    // For gadget-entry.js, we need to wrap it differently since it's the entry point
    if (filePath === 'src/gadget-entry.js') {
        // Remove the outer wrapper
        content = content.replace(/\/\/ <nowiki>\n\nif \(typeof categoryBatchManager === 'undefined'\) \{\s*var categoryBatchManager = \{\};\s*\}\n\n/m, '');
        content = content.replace(/\n\n\/\/ <\/nowiki>\n$/, '');
    }

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
 * Built from: https://github.com/MrIbrahem/owid-cats
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
    console.log('Copying CSS file...');

    const cssContent = fs.readFileSync(CSS_SOURCE, 'utf8');
    fs.writeFileSync(OUTPUT_CSS, cssContent, 'utf8');
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
