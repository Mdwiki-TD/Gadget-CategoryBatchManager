# Unused Functions Report (TODO: use it in the workflow)

**Date:** February 11, 2026
**Version:** 1.1.1

---

## Executive Summary

We identified **9 functions** tagged with `TODO: use it in the workflow` that are not currently used in the workflow. Some of these functions can significantly improve performance, while others can be deleted or merged.

---

## Functions Recommended for Use (High Priority)

### 1. `updateCategoriesOptimized()` ⭐⭐⭐

**Location:** `src/services/CategoryService.js` (Lines 110–153)

**Description:** An optimized function for updating categories using `mw.Api.edit()` instead of the traditional approach.

**Features:**

-   Better handling of edit conflicts
-   Uses `mw.Api.edit()` with a transform function
-   Ensures the latest version of the page is read before editing
-   Prevents data loss in concurrent edits

**Current Status:**

-   ✅ Fully tested (10 tests)
-   ✅ 100% coverage
-   ❌ Not used in the workflow

**Recommendation:** **Replace `updateCategories()` with `updateCategoriesOptimized()`**

**Required Change:**

```javascript
// In BatchProcessor.js (Line 74)
// Current:
const result = await this.categoryService.updateCategories(
    file.title,
    categoriesToAdd,
    categoriesToRemove
);

// Recommended:
const result = await this.categoryService.updateCategoriesOptimized(
    file.title,
    categoriesToAdd,
    categoriesToRemove
);
```

**Benefit:** Significant improvement in the reliability of concurrent edits and reduced edit conflicts.

---

### 2. `isValidCategoryName()` ⭐⭐

**Location:** `src/utils/Validator.js` (Lines 12–20)

**Description:** Validates a category name.

**Features:**

-   Checks for invalid characters
-   Prevents code injection
-   Validates name length

**Current Status:**

-   ✅ Tested
-   ❌ Not used in the workflow

**Recommendation:** **Add it for user input validation**

**Suggested Usage Locations:**

-   In `CategoryInputsHandler.js` — when adding/removing categories
-   In `ChangesHandler.js` — when validating categories before processing

---

## Functions Recommended for Deletion

### 6. `getCurrentCategories()`

**Location:** `src/services/CategoryService.js` (Lines 161–167)

**Description:** Fetches the current categories for a file.

**Why Delete?**

-   A simple wrapper around `api.getCategories()`
-   Adds no real value
-   `api.getCategories()` can be used directly

**Recommendation:** Delete and use `APIService.getCategories()` directly when needed.

---

### 8. `extractCategories()`

**Location:** `src/utils/WikitextParser.js` (Lines 12–22)

**Description:** Extracts all categories from wikitext.

**Why Delete?**

-   Relying on `APIService.getCategories()` is more reliable
-   Wikitext parsing is complex and error-prone
-   There is no need to extract categories from raw text

---

## Proposed Action Plan

### Phase 1 — Replace the Optimized Function (Required)

1. Replace `updateCategories()` with `updateCategoriesOptimized()` in `BatchProcessor.js`
2. Test the change thoroughly
3. Monitor performance in the production environment

### Phase 2 — Add Validation (Recommended)

1. Add `isValidCategoryName()` in `CategoryInputsHandler.js`
2. Add clear error messages for the user
3. Test edge cases

### Phase 3 — Cleanup (Optional)

1. Delete unused functions
2. Update tests
3. Update documentation

---

## Recommendations Summary

| Function                      | Recommendation | Priority | Effort |
| ----------------------------- | -------------- | -------- | ------ |
| `updateCategoriesOptimized()` | Use it         | High     | Low    |
| `isValidCategoryName()`       | Use it         | Medium   | Low    |
| `buildEditSummary()`          | Merge it       | Low      | Low    |
| `removeCategoriesFromFile()`  | Delete it      | Low      | —      |
| `getCurrentCategories()`      | Delete it      | Low      | —      |
| `sanitizeInput()`             | Delete it      | Low      | —      |
| `extractCategories()`         | Delete it      | Low      | —      |

---

## Conclusion

-   **Two functions** are worth using: `updateCategoriesOptimized()` and `isValidCategoryName()`
-   **Seven functions** can be deleted to simplify the codebase
-   Using `updateCategoriesOptimized()` will deliver a **significant improvement** in edit reliability

---

**Final Recommendation:** Start using `updateCategoriesOptimized()` immediately to improve process reliability, while planning to remove unused functions in the next release.
