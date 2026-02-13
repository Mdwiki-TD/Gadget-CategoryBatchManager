# Category Batch Manager

A Vue.js-based MediaWiki gadget for batch category management on Wikimedia Commons. Designed for efficiently managing categories across multiple files with support for search, preview, and rate-limited batch operations.

## Features

- **Search Files in Categories**
  - Search by source category
  - Filter by title pattern (regex support)
  - Advanced search pattern support
  - Configurable result limit (up to 10,000 files)

- **Batch Category Operations**
  - Add multiple categories at once
  - Remove multiple categories at once
  - Preview changes before execution
  - Progress tracking with real-time updates

- **Smart Features**
  - Category autocomplete with live suggestions
  - Circular category detection
  - Duplicate category prevention
  - Automatic rate limiting (discovers user limits from API)

- **User Interface**
  - Built with Vue.js 3
  - Wikimedia Codex design system
  - Dialog-based interface for Category pages
  - Responsive layout
## Preview at Wikimedia Commons

To install this tool on Wikimedia Commons:

1. Open your personal JavaScript page:  
   `https://commons.wikimedia.org/wiki/Special:MyPage/common.js`

2. Add the following lines:

```javascript
mw.loader.load('https://commons.wikimedia.org/wiki/User:Mr._Ibrahem/Gadget-CategoryBatchManager.js?action=raw&ctype=text/javascript');
mw.loader.load('https://commons.wikimedia.org/wiki/User:Mr._Ibrahem/Gadget-CategoryBatchManager.css?action=raw&ctype=text/css', 'text/css');
```

3. Save the page.  
4. Refresh the browser cache (Ctrl + F5).
   
## Deployment to Wikimedia Commons

### Step-by-Step Guide

#### 1. Build the Project

```bash
# Run tests first
npm test

# Build production files
node build.js
```

This creates:
- `dist/test3.js` - JavaScript bundle
- `dist/test3.css` - CSS bundle

#### 2. Create/Edit Gadget Pages on Wikimedia Commons

Navigate to each page below, click "Edit source", and paste the contents:

**JavaScript File:**
- Go to: https://commons.wikimedia.org/wiki/MediaWiki:Gadget-CategoryBatchManager.js
- Paste contents of `dist/test3.js`
- Add summary: `Update Category Batch Manager to v1.1.1`
- Click "Publish changes"

**CSS File:**
- Go to: https://commons.wikimedia.org/wiki/MediaWiki:Gadget-CategoryBatchManager.css
- Paste contents of `dist/test3.css`
- Add summary: `Update Category Batch Manager styles to v1.1.1`
- Click "Publish changes"

#### 3. Register the Gadget

Edit the gadget definition file:
- Go to: https://commons.wikimedia.org/wiki/MediaWiki:Gadgets-definition
- Add the following line:
```
* CategoryBatchManager[ResourceLoader|dependencies=@wikimedia/codex,mediawiki.api,vue|type=general|default]|CategoryBatchManager.js|CategoryBatchManager.css
```

**Explanation of parameters:**
- `ResourceLoader` - Uses ResourceLoader for efficient loading
- `dependencies` - Required MediaWiki modules
- `type=general` - Available for all users
- `default` - Enabled by default for logged-in users

#### 4. Enable and Test

1. Go to your preferences: https://commons.wikimedia.org/wiki/Special:Preferences
2. Navigate to the "Gadgets" tab
3. Find "Category Batch Manager" in the list
4. Check the box to enable it
5. Click "Save"

#### 5. Verify Installation

1. Navigate to any Category page on Commons (e.g., `Category:Charts`)
2. Look for "Batch Manager" link in the top menu (near "Edit", "History", etc.)
3. Click it to open the gadget dialog
4. Try searching for files to verify it works

### Quick Deployment Script

For automated deployment, you can use this sequence after building:

```bash
# Build
npm run build

# Copy dist files to clipboard or use a tool to upload
# Files to upload:
# - dist/test3.js   → MediaWiki:Gadget-CategoryBatchManager.js
# - dist/test3.css  → MediaWiki:Gadget-CategoryBatchManager.css
```

### Troubleshooting Deployment

| Problem | Solution |
|----------|----------|
| Gadget doesn't appear | Check Gadgets-definition syntax, ensure dependencies are correct |
| Console errors | Verify all files were copied correctly, check for syntax errors |
| Styles not applied | Ensure CSS file name matches in Gadgets-definition |
| Vue not loading | Check that `vue` is in dependencies list |
| Codex components broken | Verify `@wikimedia/codex` is in dependencies |

## Development

### Prerequisites

- Node.js 16+ and npm

### Setup

```bash
# Clone the repository
git clone https://github.com/Mdwiki-TD/Gadget-CategoryBatchManager
cd Gadget-CategoryBatchManager

# Install dependencies
npm install
```

### Development

```bash
# Run Vite dev server (for local testing only)
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build for production
node build.js
```

### Build Output

The `node build.js` command creates:
- `dist/test3.js` - Concatenated JavaScript bundle
- `dist/test3.css` - Concatenated CSS bundle

**Note:** This project uses a custom build system (`build.js`) that concatenates source files in a specific order, stripping ES6 import/export statements for MediaWiki compatibility. Vite is used only for local development.

## Architecture

The codebase follows a strict three-layer architecture:

```
Services (business logic)
    ↓
Handlers (orchestration + state management)
    ↓
Panels (pure UI - templates + v-model bindings)
```

- **Services** (`src/services/`) - API interactions, business logic
  - `APIService` - MediaWiki API wrapper with rate limiting
  - `CategoryService` - Category operations
  - `BatchProcessor` - Batch execution with rate limiting
  - `SearchService` - File search operations

- **Handlers** (`src/ui/handlers/`) - Orchestration layer
  - `SearchHandler` - Manages search workflow
  - `ExecuteHandler` - Manages batch execution
  - `CategoryInputsHandler` - Category input management
  - `ProgressHandler` - Progress tracking

- **Panels** (`src/ui/panels/`) - Vue UI components
  - `SearchPanel` - Search interface
  - `CategoryInputsPanel` - Category selection
  - `PreviewPanel` - Change preview
  - `ExecutePanel` - Execution controls
  - `FilesListPanel` - File list display

### Key Patterns

- **Factory functions** - All Vue components use factory pattern for fresh instances
- **Dependency injection** - `BatchManager.js` is the composition root
- **Category normalization** - Handles space/underscore equivalence (MediaWiki treats them identically)
- **Rate limiting** - Dynamically discovers user limits and enforces concurrency

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/unit/Validator.test.js

# Generate coverage report
npm run test:coverage
```

Tests use Jest and aim for 90%+ coverage.

## Usage

1. **Open a Category page** on Wikimedia Commons (e.g., `Category:Our World in Data graphs`)

2. **Click "Batch Manager"** in the top menu (portlet link)

3. **Search for files**:
   - Enter a source category, or
   - Use an advanced search pattern

4. **Select categories** to add/remove using the autocomplete inputs

5. **Select files** from the results list (checkboxes)

6. **Preview changes** by clicking the Preview button

7. **Execute** by clicking the Go button and confirming

## Debug Mode

Add `?debug=1` to the URL to enable debug mode:
- Console logging for API calls
- Simulated edits (no actual changes made)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new code
4. Ensure all tests pass (`npm test`)
5. Build the project (`npm run build`)
6. Submit a pull request

### Code Style

- Use JSDoc for function documentation
- Follow existing patterns (Service-Handler-Panel)
- Use factory functions for Vue components
- Normalize category names before comparisons
- Always use `APIService` for API calls

## Known Issues

See [CHANGELOG.md](CHANGELOG.md) for version history and resolved issues.

## License

MIT License - See LICENSE file for details

## Links
- [Gadget page at Wikimedia Commons](https://commons.wikimedia.org/wiki/User:Mr._Ibrahem/Gadget-CategoryBatchManager)
- [Wikimedia Codex Design System](https://doc.wikimedia.org/codex/latest/)
