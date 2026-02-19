# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Category Batch Manager** - A Vue.js-based Wikimedia Commons gadget for batch category management on file pages. The tool searches for files in categories, allows adding/removing categories in batch, and executes changes with proper rate limiting and progress tracking.

---

## Build System

### The `build.js` Bundle System (Production)

This project uses a **custom concatenation build** in `build.js` (NOT a standard bundler like Vite). This is critical for deploying as a MediaWiki gadget.

**Load order is strictly defined in `SOURCE_FILES` array** - dependencies must be loaded before dependents:
1. Utils (ChangeCalculator, RateLimiter, Validator, WikitextParser)
2. Models (FileModel)
3. Services (APIService, BatchProcessor, CategoryService, SearchService)
4. UI components
5. UI panels
6. UI handlers
7. UI helpers
8. BatchManager, BatchManagerWrappers, gadget-entry

The build process:
- Strips `import/export` statements (files use ES modules for development)
- Strips `/* global ... */` comments
- Concatenates with file marker comments (`// === path/to/file ===`)
- Wraps in `<nowiki>` tags for MediaWiki
- Outputs to `dist/test3.js` and `dist/test3.css`

### Development Mode

```bash
npm run dev    # Vite dev server (for local testing only)
npm run build  # Production build (deploys to Wikimedia Commons)
npm test       # Run Jest tests
```

**Note:** Vite is only for local development. The `build.js` script creates the actual gadget bundle.

---

## Architecture Patterns

### 1. Service-Handler-Panel Separation

The codebase follows a strict three-layer architecture:

```
Services (business logic)
    ↓
Handlers (orchestration + state management)
    ↓
Panels (pure UI - templates + v-model bindings)
```

**Example: Search Flow**
- `SearchService` - API calls, data fetching
- `SearchHandler` - Orchestrates search, manages callbacks for progress/completion/error
- `SearchPanel` - Only renders UI, wires callbacks to handler, delegates everything else

**Key insight:** Panels should NEVER contain business logic. If you find API calls or complex validation in a Panel, move it to a Handler or Service.

### 2. Dependency Injection in `BatchManager.js`

`BatchManager.js` is the main composition root. It:
- Instantiates all services with their dependencies
- Passes services to handlers via constructor
- Passes handlers to panels as props

```javascript
// In BatchManager.js
const api = new APIService();
const categoryService = new CategoryService(api);
const batchProcessor = new BatchProcessor(categoryService);
const execute_handler = new ExecuteHandler(batchProcessor);
// Later: <ExecutePanel :execute-handler="execute_handler" />
```

**When adding features:** Follow this chain - don't create services directly in handlers or panels.

### 3. Rate Limiting Architecture

Rate limiting is handled at TWO levels:

1. **Dynamic discovery via `APIService.fetchUserRateLimits()`** - Queries MediaWiki API for user's actual rate limits

2. **`RateLimiter.configure({ hits, seconds })`** - Converts API limits to:
   - `concurrency` = floor(hits / seconds) - parallel requests
   - `intervalMs` = (seconds * 1000) / hits - delay between batches

3. **`BatchProcessor.processBatch()`** - Uses `RateLimiter.batch()` to process files in concurrent batches with inter-batch delays

**Important:** Always use `BatchProcessor.processBatch()` for edits, never call `CategoryService.updateCategoriesOptimized()` directly in a loop.

### 4. Vue Component Pattern

All UI components follow the **factory function pattern**:

```javascript
function MyComponent() {
    return {
        props: { ... },
        data() { return { ... } },
        methods: { ... },
        template: `...`
    };
}
export default MyComponent;
```

**Why?** This enables fresh instances per component usage and avoids shared state between component instances.

### 5. MediaWiki API Integration

**Always use `APIService` methods, never raw `mw.Api`:**

```javascript
// Correct
const categories = await apiService.getCategories(fileName);
await apiService.editPage(title, content, summary);

// Wrong
const api = new mw.Api();
await api.get({ action: 'query', ... });
```

`APIService` wraps `mw.Api` with:
- CSRF token handling
- Automatic bad-token retry
- Proper origin headers
- Debug mode (add `?debug=1` to URL)

### 6. Category Normalization (Critical)

MediaWiki treats spaces and underscores as equivalent:
- `Our_World_in_Data` = `Our World in Data`

**Always normalize before comparisons:**
```javascript
import { Validator } from './utils/Validator.js';
const normalized = Validator.normalizeCategoryName(rawName);
```

This is handled in:
- `Validator.normalizeCategoryName()` - Single category
- `CategoryLookup` component - Normalizes all search results
- Validation helpers - Check circular categories with normalization

---

## File Loading in MediaWiki

The gadget entry point is `gadget-entry.js`:

1. Loads via `mw.loader.using(['@wikimedia/codex', 'mediawiki.api', 'vue'])`
2. Creates portlet link ("Batch Manager" in top menu)
3. Mounts Vue app to `#category-batch-manager2` div
4. Registers Codex components globally (`cdx-button`, `cdx-dialog`, etc.)

**Only runs on Category namespace pages** (`wgCanonicalNamespace === 'Category'`).

---

## Project Structure
```
src/
├── BatchManager.js              # Composition root
├── BatchManagerWrappers.js      # Dialog/Standalone wrappers
├── gadget-entry.js              # MediaWiki entry point
├── main.js                      # Development entry point
├── models/
│   └── FileModel.js             # File data structure
├── services/
│   ├── APIService.js            # MediaWiki API wrapper
│   ├── SearchService.js         # File search logic
│   ├── CategoryService.js       # Category operations
│   ├── BatchProcessor.js        # Batch execution engine
│   └── mw.js                    # MediaWiki object mock
├── ui/
│   ├── components/
│   │   ├── CategoryLookup.js   # Multiselect with autocomplete
│   │   ├── PreviewTable.js     # Change table display
│   │   └── ProgressBar.js      # Progress indicator
│   ├── panels/
│   │   ├── SearchPanel.js      # Search interface
│   │   ├── CategoryInputsPanel.js
│   │   ├── FilesListPanel.js
│   │   ├── PreviewPanel.js
│   │   └── ExecutePanel.js
│   ├── handlers/
│   │   ├── SearchHandler.js    # Search orchestration
│   │   ├── ExecuteHandler.js   # Execution orchestration
│   │   ├── CategoryInputsHandler.js
│   │   └── ProgressHandler.js
│   ├── helpers/
│   │   ├── ValidationHelper.js # Input validation
│   │   └── ChangesHelper.js    # Change detection
│   └── styles/
│       └── main.css             # Component styles
└── utils/
    ├── ChangeCalculator.js      # Diff computation
    ├── RateLimiter.js           # Concurrency control
    ├── Validator.js             # Data validation
    └── WikitextParser.js        # Content parsing
```
---

## Common Operations

### Running Tests

```bash
npm test                     # All tests
npm test -- --coverage      # With coverage report
npm test -- tests/unit/Validator.test.js  # Single test file
```

### Building for Production

```bash
npm run build
# Outputs: dist/test3.js, dist/test3.css
```

### Adding a New Service Method

1. Add method to appropriate Service (APIService, CategoryService, etc.)
2. Create Handler method if orchestration needed
3. Add Panel UI if user interaction needed
4. Wire through `BatchManager.js` composition
5. Add tests
6. Update `CHANGELOG.md`

### Adding a New UI Component

1. Create in `src/ui/components/` using factory pattern
2. Import in `src/ui/components/index.js`
3. Use in any Panel via component registration
4. Add to `SOURCE_FILES` in `build.js` (before panels that use it)

---

## Important Gotchas

1. **Load order in `build.js`** - If you get "X is not defined", check the file appears after its dependencies in `SOURCE_FILES`.

2. **Circular category detection** - Must use normalized names when checking if a category equals the source category.

3. **Rate limiter initialization** - `BatchProcessor.initRateLimiter()` fetches live limits; call once before `processBatch()`.

4. **MediaWiki namespace** - Files on Commons have "File:" prefix, categories have "Category:" - many APIs expect the prefix, some don't.

5. **Debug mode** - Add `?debug=1` to URL to enable console logging and simulate edits without making real changes.

---

## Documentation Files

- `CHANGELOG.md` - Version history and feature changes
- `README.md` - Basic project overview (currently a dev checklist)
- `docs/TODO_FUNCTIONS_REPORT.md` - Feature completion status

**Do not create new docs without checking existing files first.**
