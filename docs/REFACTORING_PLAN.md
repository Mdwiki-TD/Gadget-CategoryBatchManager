# Refactoring Plan: Category Batch Manager

**Analysis Date:** February 13, 2026
**Analyst:** Claude Refactoring Analyst
**Version Analyzed:** 1.1.1

---

## Executive Summary

The Category Batch Manager is a well-structured Vue.js/MediaWiki gadget that demonstrates solid adherence to the Service-Handler-Panel architecture pattern. The codebase is generally clean, with good separation of concerns. However, there are several opportunities for improvement in the areas of code duplication, unused functions, type safety, and error handling consistency.

**Top 5 Recommendations:**

1. **Critical:** Replace `updateCategories()` with `updateCategoriesOptimized()` for better edit conflict handling
2. **High:** Consolidate duplicate pattern creation logic between SearchHandler and APIService
3. **High:** Implement `isValidCategoryName()` validation in the user input flow
4. **Medium:** Standardize error handling patterns across services
5. **Medium:** Remove or integrate 7 unused TODO-marked functions to reduce code bloat

---

## Current State Assessment

### Strengths

1. **Clear Architecture:** The Service-Handler-Panel separation is well-implemented and consistently applied
2. **Rate Limiting:** Sophisticated two-level rate limiting with dynamic API discovery
3. **Category Normalization:** Robust handling of MediaWiki's space/underscore equivalence
4. **Test Coverage:** Good unit test coverage for core utilities and services
5. **Build System:** Custom concatenation build is appropriate for MediaWiki gadget deployment
6. **Mobile Responsive:** CSS includes comprehensive responsive styles
7. **Documentation:** CLAUDE.md provides excellent guidance for developers

### Areas for Improvement

1. **Dead Code:** Multiple functions marked TODO that are never called
2. **Code Duplication:** Pattern creation logic duplicated between handlers and services
3. **Type Safety:** No TypeScript or JSDoc type checking in CI
4. **Error Handling:** Inconsistent error handling patterns across layers
5. **Static Method Confusion:** `RateLimiter.batch()` exists as both instance and static method
6. **Missing Validation:** User inputs not validated before category operations

---

## Detailed Findings

### 1. Dead Code and Unused Functions

**Priority:** High
**Impact:** Code maintainability, bundle size

#### Issues Found:

-   [x] **CategoryService.js:19-48** - `addCategoriesToFile()` - Single-purpose function superseded by `updateCategories()`
-   [x] **CategoryService.js:57-77** - `removeCategoriesFromFile()` - Single-purpose function superseded by `updateCategories()`
-   [x] **CategoryService.js:122-163** - `updateCategoriesOptimized()` - Tested but not integrated (CRITICAL)
-   [x] **CategoryService.js:171-177** - `getCurrentCategories()` - Thin wrapper around `api.getCategories()`
-   [ ] **Validator.js:12-20** - `isValidCategoryName()` - Validation not used in workflow
-   [x] **Validator.js:62-65** - `sanitizeInput()` - Only trims, misleading name

#### Recommendations:

1. **Immediate:** Replace `updateCategories()` with `updateCategoriesOptimized()` in BatchProcessor
2. **Short-term:** Integrate `isValidCategoryName()` into CategoryInputsHandler
3. **Cleanup:** Remove `addCategoriesToFile()`, `removeCategoriesFromFile()`, `getCurrentCategories()`, `sanitizeInput()`

```javascript
// In BatchProcessor.js line 96, change:
const result = await this.category_service.updateCategories(
    file.title,
    categoriesToAdd,
    categoriesToRemove
);

// To:
const result = await this.category_service.updateCategoriesOptimized(
    file.title,
    categoriesToAdd,
    categoriesToRemove
);
```

---

### 2. Code Duplication (DRY Violations)

**Priority:** High
**Impact:** Maintainability, consistency

#### Issues Found:

-   [ ] **SearchHandler.js:50-65** vs **APIService.js:194-205** - Pattern creation logic duplicated
-   [ ] **ExecutePanel.js:147-152** vs **ProgressHandler.js:20-23** - Progress formatting duplicated
-   [ ] **BatchManager.js:132-139** - `createLookupModel()` could be a shared utility

#### Duplicated Pattern Logic:

```javascript
// SearchHandler.js lines 50-64
createPattern(categoryName, titlePattern) {
    const searchCategoryName = categoryName.replace(/^Category:/i, '').replace(/\s+/g, '_');
    if (searchCategoryName.trim() === '') return '';
    let srsearch = `incategory:${searchCategoryName}`;
    const sanitizedPattern = Validator.sanitizeTitlePattern(titlePattern);
    if (sanitizedPattern.trim() !== '') {
        srsearch += ` intitle:/${sanitizedPattern}/`;
    }
    return srsearch;
}

// APIService.js lines 194-205 (similar but different)
async searchInCategory(categoryName, titlePattern) {
    const sanitizedPattern = Validator.sanitizeTitlePattern(titlePattern);
    const searchCategoryName = categoryName.replace(/\s+/g, '_');
    const srsearch = sanitizedPattern.trim()
        ? `incategory:${searchCategoryName} intitle:/${sanitizedPattern}/`
        : `incategory:${searchCategoryName}`;
    return await this.searchInCategoryWithPattern(srsearch);
}
```

#### Recommendations:

1. Consolidate pattern creation in `SearchService` or a utility module
2. Have `SearchHandler.createPattern()` be the single source of truth
3. Remove `APIService.searchInCategory()` or make it delegate to SearchHandler logic

---

### 3. RateLimiter Static vs Instance Method Confusion

**Priority:** Medium
**Impact:** API confusion, potential bugs

#### Issues Found:

-   [ ] **RateLimiter.js:158-177** - Instance method `batch()` with rate limiting
-   [ ] **RateLimiter.js:192-202** - Static method `batch()` without rate limiting

Both methods have the same name but different behavior:

```javascript
// Instance method (rate-limited)
await this.rate_limiter.batch(files, this.concurrency, processFile);

// Static method (no rate limiting)
await RateLimiter.batch(items, batchSize, processor);
```

#### Recommendations:

1. Rename static method to `batchUnlimited()` or `batchParallel()`
2. Add JSDoc to clearly distinguish the two methods
3. Ensure documentation explains when to use each

---

### 4. Error Handling Inconsistency

**Priority:** Medium
**Impact:** User experience, debugging

#### Issues Found:

-   [ ] **APIService.js:341-348** - Catches and logs but re-throws
-   [ ] **CategoryService.js:86-112** - Returns `{success: boolean}` pattern
-   [ ] **BatchProcessor.js:124-150** - Complex error handling with rate limit backoff
-   [ ] **Handlers** - Use callback pattern with `onError` callbacks
-   [ ] **Panels** - Emit events for errors

#### Recommendations:

1. Create a custom error class hierarchy:

    ```javascript
    class CBMError extends Error {}
    class CBMRateLimitError extends CBMError {}
    class CBMValidationError extends CBMError {}
    class CBMAPIError extends CBMError {}
    ```

2. Standardize error propagation pattern across layers
3. Add error codes for programmatic handling

---

### 5. Missing Input Validation

**Priority:** Medium
**Impact:** Data integrity, user experience

#### Issues Found:

-   [ ] **CategoryInputsPanel.js** - No validation before accepting category selections
-   [ ] **ChangesHelper.js:27-38** - Only checks array lengths, not content validity
-   [ ] **Validator.isValidCategoryName()** exists but unused

#### Recommendations:

1. Add category name validation in CategoryInputsHandler:

    ```javascript
    async onCategoryInput(value, CategoryInput, input_type = 'add') {
        if (!Validator.isValidCategoryName(value)) {
            return []; // or throw validation error
        }
        // ... rest of method
    }
    ```

2. Validate categories before batch operations in ChangesHelper

---

### 6. State Management Complexity

**Priority:** Low
**Impact:** Maintainability, reactivity bugs potential

#### Issues Found:

-   [ ] **BatchManager.js:142-169** - Many state properties managed manually
-   [ ] **MessageDisplayPanel.js** - Mixin pattern that spreads into BatchManager
-   [ ] **SearchPanel.js** - Duplicates progress state that flows to parent

#### Recommendations:

1. Consider extracting state into focused composables:

    - `useSearchState()`
    - `useExecutionState()`
    - `useMessageState()`

2. Document the data flow explicitly in comments

---

### 7. Build System Improvements

**Priority:** Low
**Impact:** Development experience

#### Issues Found:

-   [ ] **build.js:10-48** - Manual file ordering is error-prone
-   [ ] No source maps generated for debugging production builds
-   [ ] No minification option for production
-   [ ] CSS concatenation doesn't handle @import

#### Recommendations:

1. Add source map generation:

    ```javascript
    // At end of bundle, add:
    const sourceMap = generateSourceMap(processedFiles);
    fs.writeFileSync(OUTPUT_JS + ".map", sourceMap);
    ```

2. Add a `--minify` flag option for production builds
3. Document the dependency order requirements in build.js header

---

### 8. Test Coverage Gaps

**Priority:** Medium
**Impact:** Code reliability

#### Missing Test Coverage:

-   [ ] **UI Panels** - No direct panel component tests
-   [ ] **UI Handlers** - Limited handler orchestration tests
-   [ ] **Integration Tests** - No end-to-end workflow tests
-   [ ] **CategoryLookup.js** - Complex async behavior untested
-   [ ] **Error paths** - Many error scenarios untested

#### Recommendations:

1. Add panel component tests with Vue Test Utils
2. Add integration tests for complete workflows:
    - Search -> Preview -> Execute
    - Error recovery scenarios
3. Test rate limit backoff behavior

---

### 9. Service-Handler-Panel Adherence

**Priority:** Low
**Impact:** Architecture consistency

#### Minor Violations Found:

-   [ ] **ExecutePanel.js:102-108** - Calls `validateAndReturnPreparation()` which contains business logic
-   [ ] **PreviewPanel.js:79-100** - Same issue, panels accessing ChangesHelper directly

#### Current Flow (Good):

```
Panel -> Handler -> Service
```

#### Recommendations:

1. Consider having panels emit validation requests to handlers
2. Or accept that helper classes bridge the gap (current approach is acceptable)

---

### 10. Documentation and Comments

**Priority:** Low
**Impact:** Maintainability

#### Issues Found:

-   [ ] **Arabic documentation** in `docs/TODO_FUNCTIONS_REPORT.md` - Should be bilingual or English
-   [ ] Some methods missing JSDoc `@param` and `@returns`
-   [ ] No architecture diagram in documentation

#### Recommendations:

1. Add English translation to TODO_FUNCTIONS_REPORT.md
2. Create ARCHITECTURE.md with visual diagram
3. Complete JSDoc coverage for all public methods

---

## Refactoring Roadmap

### Phase 1: Quick Wins (1-2 days)

-   [x] Replace `updateCategories()` with `updateCategoriesOptimized()` in BatchProcessor
-   [ ] Integrate `isValidCategoryName()` in CategoryInputsHandler
-   [ ] Rename `RateLimiter.batch()` static method to `batchParallel()`
-   [ ] Add missing JSDoc to public methods
-   [ ] Remove clearly unused `sanitizeInput()` function

### Phase 2: Structural Improvements (1 week)

-   [ ] Consolidate pattern creation logic - single source in SearchService
-   [ ] Create custom error class hierarchy
-   [x] Remove unused functions:
    -   `addCategoriesToFile()`
    -   `removeCategoriesFromFile()`
    -   `getCurrentCategories()`
-   [ ] Add source map generation to build.js
-   [ ] Add integration tests for main workflow
-   [ ] Add English translation to TODO_FUNCTIONS_REPORT.md

### Phase 3: Major Refactoring (2+ weeks)

-   [ ] Extract state management into Vue composables
-   [ ] Add comprehensive panel component tests
-   [ ] Implement TypeScript definitions (JSDoc-based for gradual adoption)
-   [ ] Create ARCHITECTURE.md with visual diagrams
-   [ ] Add minification option to build system
-   [ ] Consider extracting shared constants to dedicated module

---

## Risk Assessment

### High Risk Areas

| Area                                 | Risk                                  | Mitigation                           |
| ------------------------------------ | ------------------------------------- | ------------------------------------ |
| `updateCategoriesOptimized()` switch | Edit conflicts may behave differently | Test extensively in debug mode first |
| Pattern consolidation                | May break search functionality        | Maintain comprehensive search tests  |
| Rate limiter rename                  | May break external dependencies       | Check all usages before renaming     |

### Low Risk Areas

| Area                 | Risk                      | Mitigation                |
| -------------------- | ------------------------- | ------------------------- |
| Dead code removal    | Minimal - unused code     | Verify no dynamic imports |
| JSDoc additions      | None - documentation only | N/A                       |
| Source maps addition | None - build enhancement  | Test output file format   |

---

## Testing Strategy

### Pre-Refactoring Tests

1. Run full test suite and capture current state
2. Manual testing of search, preview, execute workflow
3. Document current behavior for edge cases

### During Refactoring

1. Make one change at a time
2. Run tests after each change
3. Use `?debug=1` mode for testing without real edits
4. Test rate limit behavior with small batches first

### Post-Refactoring Validation

1. Run full test suite
2. Manual testing on test wiki or with debug mode
3. Verify rate limiting still works correctly
4. Test category normalization with edge cases

### Test Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/services/BatchProcessor.test.js

# Build and verify output
npm run build && head -100 dist/test3.js
```

---

## Appendix: File-by-File Notes

### Services Layer

**APIService.js** (351 lines)

-   Core API wrapper, well-structured
-   Debug mode for testing without edits
-   `searchInCategory()` duplicates logic from SearchHandler
-   Good error handling in `_get()`

**CategoryService.js** (197 lines)

-   Contains 5 TODO-marked unused functions
-   `updateCategoriesOptimized()` should replace `updateCategories()`
-   Parser instantiation in constructor is good

**SearchService.js** (147 lines)

-   Clean implementation
-   Good use of callbacks for progress
-   `createBatches()` could be a utility function

**BatchProcessor.js** (167 lines)

-   Critical component for rate limiting
-   Complex error handling for rate limits
-   Should use `updateCategoriesOptimized()`

**mw.js** (129 lines)

-   Development shim for MediaWiki API
-   Good mock implementation
-   Simulates edits in dev mode

### Handlers Layer

**SearchHandler.js** (131 lines)

-   Pattern creation duplicates APIService
-   Good callback-based architecture
-   Clean state management

**ExecuteHandler.js** (60 lines)

-   Thin wrapper around BatchProcessor
-   Could potentially be simplified

**CategoryInputsHandler.js** (69 lines)

-   Handles autocomplete logic
-   Good debouncing implied by async handling
-   Should add category validation

**ProgressHandler.js** (69 lines)

-   Formatting logic duplicated in ExecutePanel
-   Consider consolidating

### Panels Layer

**SearchPanel.js** (178 lines)

-   Clean delegation to handler
-   Progress state synced to parent
-   Good validation before search

**ExecutePanel.js** (210 lines)

-   Contains some formatting logic (DRY violation)
-   Dialog management is clean

**CategoryInputsPanel.js** (51 lines)

-   Very thin, just renders two CategoryLookup components
-   Could be simplified further

**FilesListPanel.js** (89 lines)

-   Pure presentational component
-   Good computed properties

**PreviewPanel.js** (117 lines)

-   Calls ChangesHelper directly
-   Clean dialog management

**MessageDisplayPanel.js** (70 lines)

-   Mixin pattern works well
-   Used by BatchManager via spread

**ReportsPanel.js** (150 lines)

-   New feature, well-implemented
-   Uses Constants for status values

### UI Components

**CategoryLookup.js** (98 lines)

-   Complex async behavior
-   Needs tests
-   Good prop design

**PreviewTable.js** (107 lines)

-   Custom slot templates for cells
-   Sorting implementation is clean

**ProgressBar.js** (38 lines)

-   Simple, reusable component
-   Good prop design

**Tab.js / Tabs.js**

-   Thin wrappers around Codex components
-   Necessary for build system

### Utils

**Validator.js** (96 lines)

-   Static utility class
-   `normalizeCategoryName()` is critical
-   Some functions unused

**RateLimiter.js** (205 lines)

-   Instance method `batch()` is rate-limited
-   Static method `batch()` is not
-   Good dynamic configuration

**ChangeCalculator.js** (114 lines)

-   Pure functions, well-tested
-   No side effects
-   Good separation

**WikitextParser.js** (117 lines)

-   Handles spaces/underscores correctly
-   Regex escaping is thorough
-   Good test coverage

**Constants.js** (26 lines)

-   Simple constants module
-   `FILE_STATUS` enum
-   `DEFAULT_EXECUTION_SUMMARY` shape

### Entry Points

**BatchManager.js** (220 lines)

-   Composition root
-   Good service instantiation
-   Template is large but manageable

**BatchManagerWrappers.js** (88 lines)

-   Dialog and standalone modes
-   Template construction is conditional
-   Handles execution results for reports

**gadget-entry.js** (48 lines)

-   MediaWiki loader integration
-   Codex component registration
-   Clean entry point

---

## Summary Statistics

| Metric             | Value  |
| ------------------ | ------ |
| Total Source Files | 41     |
| Total Source Lines | ~3,200 |
| Test Files         | 14     |
| TODO Comments      | 7      |
| Services           | 5      |
| Handlers           | 4      |
| Panels             | 7      |
| Components         | 6      |
| Utils              | 5      |

---

## Conclusion

The Category Batch Manager codebase demonstrates solid architectural foundations with the Service-Handler-Panel pattern. The primary refactoring opportunities are:

1. **Dead code elimination** - Remove 5-7 unused functions
2. **DRY compliance** - Consolidate duplicated pattern logic
3. **Critical integration** - Use `updateCategoriesOptimized()` for better reliability
4. **Validation gaps** - Integrate existing `isValidCategoryName()`

The recommended approach is incremental: start with Phase 1 quick wins, particularly the `updateCategoriesOptimized()` integration, then proceed to structural improvements as time permits.

---

_Generated by Claude Refactoring Analyst_
