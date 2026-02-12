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

## Installation (Wikimedia Commons)

### As a Gadget

1. Copy the contents of `dist/Gadget-CategoryBatchManager.js` to [MediaWiki:Gadget-CategoryBatchManager.js](https://commons.wikimedia.org/wiki/MediaWiki:Gadget-CategoryBatchManager.js) on Wikimedia Commons

2. Copy the contents of `dist/Gadget-CategoryBatchManager.css` to [MediaWiki:Gadget-CategoryBatchManager.css](https://commons.wikimedia.org/wiki/MediaWiki:Gadget-CategoryBatchManager.css)

3. Add to [MediaWiki:Gadgets-definition](https://commons.wikimedia.org/wiki/MediaWiki:Gadgets-definition):
```
* CategoryBatchManager[ResourceLoader|dependencies=@wikimedia/codex,mediawiki.api,vue|type=general|default]|CategoryBatchManager.js|CategoryBatchManager.css
```

4. Enable the gadget in your preferences on Wikimedia Commons

## Development

### Prerequisites

- Node.js 16+ and npm

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/Category-Batch-Manager.git
cd Category-Batch-Manager

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
npm run build
```

### Build Output

The `npm run build` command creates:
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

- [Wikimedia Commons](https://commons.wikimedia.org/)
- [MediaWiki Gadgets Documentation](https://www.mediawiki.org/wiki/Manual:Gadgets)
- [Wikimedia Codex Design System](https://doc.wikimedia.org/codex/latest/)
