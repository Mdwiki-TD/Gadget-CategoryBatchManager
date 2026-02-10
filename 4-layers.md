# Separation of Concerns Refactoring Plan

## Overview
This document outlines a comprehensive plan to refactor the Category Batch Manager codebase to follow the Separation of Concerns (SoC) principle. The current code has several violations where business logic, UI concerns, and data management are mixed together.

## Current Architecture Issues

### 1. **Mixed Responsibilities in Components**
- UI components contain business logic
- Handlers manipulate Vue state directly
- Service classes have inconsistent responsibilities

### 2. **Tight Coupling**
- Components pass `self` (Vue instance) to methods
- Business logic depends on Vue reactive state
- No clear boundaries between layers

### 3. **Scattered State Management**
- State scattered across multiple component classes
- No centralized state management
- Difficult to track state mutations

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Presentation Layer                   │
│  (Vue Components - UI Only, No Business Logic)          │
│  - BatchManager.vue (Main Component)                    │
│  - SearchPanel.vue                                       │
│  - CategoryInputs.vue                                    │
│  - FilesList.vue                                         │
│  - ProgressBar.vue                                       │
│  - PreviewDialog.vue                                     │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│  (Business Logic - Pure Functions/Classes)              │
│  - BatchOperationService                                │
│  - ValidationService                                     │
│  - PreviewService                                        │
│  - SearchService                                         │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                      Domain Layer                        │
│  (Core Business Models & Rules)                         │
│  - FileModel                                            │
│  - CategoryOperation                                     │
│  - ValidationRules                                       │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                   │
│  (External Services & Utilities)                        │
│  - APIService                                           │
│  - WikitextParser                                        │
│  - RateLimiter                                          │
└─────────────────────────────────────────────────────────┘
```

## Detailed Refactoring Steps

### Phase 1: Extract Business Logic from UI Components

#### 1.1 CategoryInputs Component
**Current Issues:**
- Contains autocomplete logic mixed with API calls
- Displays messages directly
- Manages its own state

**Refactoring:**
```javascript
// Before: CategoryInputs.js handles everything
class CategoryInputs {
    async onAddCategoryInput(self, value) {
        this.hideCategoryMessage('add');
        const data = await this.apiService.fetchCategories(value);
        self.addCategory.menuItems = data;
    }
}

// After: Separate concerns
// 1. Create CategorySearchService (Application Layer)
class CategorySearchService {
    constructor(apiService) {
        this.apiService = apiService;
    }

    async searchCategories(query, options = {}) {
        if (!query || query.trim().length < 2) {
            return [];
        }
        return await this.apiService.fetchCategories(query, options);
    }

    deduplicateResults(existing, newResults) {
        const seen = new Set(existing.map(r => r.value));
        return newResults.filter(r => !seen.has(r.value));
    }
}

// 2. Vue component becomes pure UI
const CategoryInputsComponent = {
    props: ['modelValue', 'type'],
    emits: ['update:modelValue', 'search'],
    methods: {
        handleInput(value) {
            this.$emit('search', value);
        }
    },
    template: `...pure template...`
}
```

#### 1.2 SearchHandler Component
**Current Issues:**
- Manipulates Vue state directly (`self.isSearching = true`)
- Contains business logic for search execution
- Mixes UI concerns with data fetching

**Refactoring:**
```javascript
// Before: SearchHandler manipulates state
class SearchHandler {
    async searchFiles(self) {
        self.isSearching = true;
        self.searchResults = await self.search_service.searchFiles(...);
        self.workFiles = [...self.searchResults];
        self.showProgress = false;
    }
}

// After: Pure service + Vue component
// 1. SearchService (Application Layer)
class SearchService {
    constructor(fileService, validationService) {
        this.fileService = fileService;
        this.validationService = validationService;
    }

    async executeSearch(sourceCategory, searchPattern) {
        // Validate inputs
        const validation = this.validationService.validateSearchInputs(
            sourceCategory,
            searchPattern
        );
        if (!validation.isValid) {
            throw new Error(validation.message);
        }

        // Execute search
        return await this.fileService.searchFiles(
            sourceCategory,
            searchPattern
        );
    }
}

// 2. Vue component handles UI state only
const SearchPanelComponent = {
    data() {
        return {
            isSearching: false,
            sourceCategory: '',
            searchPattern: ''
        }
    },
    inject: ['searchService'],
    methods: {
        async handleSearch() {
            this.isSearching = true;
            try {
                const results = await this.searchService.executeSearch(
                    this.sourceCategory,
                    this.searchPattern
                );
                this.$emit('search-complete', results);
            } catch (error) {
                this.$emit('search-error', error.message);
            } finally {
                this.isSearching = false;
            }
        }
    }
}
```

#### 1.3 PreviewHandler Component
**Current Issues:**
- Contains complex preview generation logic
- Validates data
- Manipulates modal state
- All in one class

**Refactoring:**
```javascript
// Before: Everything in PreviewHandler
class PreviewHandler {
    async handlePreview(self) {
        const validation = this.validator.validateBatchOperation(self, self.workFiles, addCategory.selected, removeCategory.selected);
        const preview = await this.previewChanges(...);
        this.showPreviewModal(self, preview);
    }
}

// After: Separate into layers
// 1. PreviewService (Application Layer)
class PreviewService {
    constructor(validationService) {
        this.validationService = validationService;
    }

    async generatePreview(files, categoriesToAdd, categoriesToRemove) {
        return files.map(file => {
            const newCategories = this.calculateNewCategories(
                file.currentCategories,
                categoriesToAdd,
                categoriesToRemove
            );

            return {
                file: file.title,
                currentCategories: file.currentCategories,
                newCategories: newCategories,
                willChange: this.hasChanges(
                    file.currentCategories,
                    newCategories
                )
            };
        });
    }

    calculateNewCategories(current, toAdd, toRemove) {
        let result = [...current];

        // Remove categories
        toRemove.forEach(cat => {
            const index = this.findCategoryIndex(cat, result);
            if (index > -1) result.splice(index, 1);
        });

        // Add categories
        toAdd.forEach(cat => {
            if (!this.categoryExists(cat, result)) {
                result.push(cat);
            }
        });

        return result;
    }

    hasChanges(current, newCats) {
        return JSON.stringify(current) !== JSON.stringify(newCats);
    }
}

// 2. Vue component for UI
const PreviewDialogComponent = {
    props: ['modelValue', 'previewData'],
    emits: ['update:modelValue', 'confirm'],
    computed: {
        changesCount() {
            return this.previewData.filter(p => p.willChange).length;
        }
    }
}
```

### Phase 2: Centralize State Management

#### 2.1 Create Store (Vuex or Pinia)
**Problem:** State scattered across component classes and Vue data

**Solution:**
```javascript
// stores/batchManagerStore.js
import { defineStore } from 'pinia';

export const useBatchManagerStore = defineStore('batchManager', {
    state: () => ({
        // Search state
        sourceCategory: '',
        searchPattern: '',
        searchResults: [],
        isSearching: false,

        // File selection state
        workFiles: [],

        // Category management state
        categoriesToAdd: [],
        categoriesToRemove: [],

        // Operation state
        isProcessing: false,
        progress: {
            current: 0,
            total: 0,
            percentage: 0
        },

        // UI state
        messages: [],
        showPreview: false,
        previewData: null
    }),

    getters: {
        selectedCount: (state) => {
            return state.workFiles.filter(f => f.selected).length;
        },

        hasValidOperation: (state) => {
            return (
                state.workFiles.length > 0 &&
                (state.categoriesToAdd.length > 0 ||
                 state.categoriesToRemove.length > 0)
            );
        }
    },

    actions: {
        async executeSearch(searchService) {
            this.isSearching = true;
            try {
                const results = await searchService.executeSearch(
                    this.sourceCategory,
                    this.searchPattern
                );
                this.searchResults = results;
                this.workFiles = [...results];
            } catch (error) {
                this.addMessage({
                    type: 'error',
                    text: error.message
                });
            } finally {
                this.isSearching = false;
            }
        },

        async generatePreview(previewService, validationService) {
            const validation = validationService.validateBatchOperation(
                this.workFiles,
                this.categoriesToAdd,
                this.categoriesToRemove
            );

            if (!validation.isValid) {
                this.addMessage({
                    type: 'warning',
                    text: validation.message
                });
                return;
            }

            this.previewData = await previewService.generatePreview(
                this.workFiles.filter(f => f.selected),
                this.categoriesToAdd,
                this.categoriesToRemove
            );
            this.showPreview = true;
        },

        addMessage(message) {
            this.messages.push({
                id: Date.now(),
                ...message
            });
        },

        clearMessages() {
            this.messages = [];
        }
    }
});
```

### Phase 3: Extract Pure Business Logic Services

#### 3.1 Create ValidationService
**Current Issues:** Validation logic mixed with UI concerns in ValidationHelper

**Solution:**
```javascript
// services/ValidationService.js
class ValidationService {
    /**
     * Validate search inputs
     */
    validateSearchInputs(sourceCategory, searchPattern) {
        if (!sourceCategory || sourceCategory.trim() === '') {
            return {
                isValid: false,
                message: 'Please enter a source category.'
            };
        }

        if (!searchPattern || searchPattern.trim() === '') {
            return {
                isValid: false,
                message: 'Please enter a search pattern.'
            };
        }

        return { isValid: true };
    }

    /**
     * Validate batch operation inputs
     */
    validateBatchOperation(workFiles, categoriesToAdd, categoriesToRemove) {
        // Check if files are selected
        const selected = workFiles.filter(f => f.selected);
        if (selected.length === 0) {
            return {
                isValid: false,
                message: 'Please select at least one file.'
            };
        }

        // Check if at least one operation is specified
        if (categoriesToAdd.length === 0 && categoriesToRemove.length === 0) {
            return {
                isValid: false,
                message: 'Please specify categories to add or remove.'
            };
        }

        return {
            isValid: true,
            workFiles: selected,
            categoriesToAdd,
            categoriesToRemove
        };
    }

    /**
     * Check for circular category references
     */
    checkCircularReferences(sourceCategory, categoriesToAdd) {
        const circular = [];
        const valid = [];

        categoriesToAdd.forEach(cat => {
            if (Validator.isCircularCategory(sourceCategory, cat)) {
                circular.push(cat);
            } else {
                valid.push(cat);
            }
        });

        if (circular.length > 0 && valid.length === 0) {
            return {
                isValid: false,
                message: `Cannot add: all categories are circular references.`,
                circular,
                valid: []
            };
        }

        return {
            isValid: true,
            circular,
            valid
        };
    }

    /**
     * Validate category name format
     */
    validateCategoryName(categoryName) {
        return Validator.isValidCategoryName(categoryName);
    }
}
```

#### 3.2 Create BatchOperationService
**Current Issues:** Execution logic in ExecuteHandler mixed with UI

**Solution:**
```javascript
// services/BatchOperationService.js
class BatchOperationService {
    constructor(categoryService, rateLimiter) {
        this.categoryService = categoryService;
        this.rateLimiter = rateLimiter;
    }

    /**
     * Execute batch operation with progress tracking
     */
    async execute(files, categoriesToAdd, categoriesToRemove, onProgress) {
        const results = {
            total: files.length,
            processed: 0,
            successful: 0,
            skipped: 0,
            failed: 0,
            errors: []
        };

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            try {
                // Rate limiting
                await this.rateLimiter.wait(2000);

                // Update categories
                const result = await this.categoryService.updateCategories(
                    file.title,
                    categoriesToAdd,
                    categoriesToRemove
                );

                results.processed++;

                if (result.success) {
                    if (result.modified) {
                        results.successful++;
                    } else {
                        results.skipped++;
                    }
                }

                // Report progress
                if (onProgress) {
                    onProgress({
                        current: results.processed,
                        total: results.total,
                        percentage: (results.processed / results.total) * 100,
                        results
                    });
                }

            } catch (error) {
                results.processed++;
                results.failed++;
                results.errors.push({
                    file: file.title,
                    error: error.message
                });

                if (onProgress) {
                    onProgress({
                        current: results.processed,
                        total: results.total,
                        percentage: (results.processed / results.total) * 100,
                        results
                    });
                }
            }
        }

        return results;
    }
}
```

### Phase 4: Refactor Vue Component Structure

#### 4.1 Main BatchManager Component
**Responsibility:** Orchestrate child components and services

```javascript
// components/BatchManager.vue
<template>
    <div class="cbm-container">
        <h2 class="cbm-title">Category Batch Manager</h2>

        <div class="cbm-main-layout">
            <!-- Left Panel -->
            <div class="cbm-left-panel">
                <SearchPanel
                    v-model:source-category="store.sourceCategory"
                    v-model:search-pattern="store.searchPattern"
                    :is-searching="store.isSearching"
                    @search="handleSearch"
                    @stop="handleStopSearch"
                />

                <CategoryInputsPanel
                    v-model:add-categories="store.categoriesToAdd"
                    v-model:remove-categories="store.categoriesToRemove"
                />

                <ActionPanel
                    :selected-count="store.selectedCount"
                    :is-processing="store.isProcessing"
                    :has-valid-operation="store.hasValidOperation"
                    @preview="handlePreview"
                    @execute="handleExecute"
                    @stop="handleStop"
                />

                <ProgressBar
                    v-if="store.isProcessing"
                    :progress="store.progress"
                />
            </div>

            <!-- Right Panel -->
            <div class="cbm-right-panel">
                <FilesList
                    v-model="store.workFiles"
                />
            </div>
        </div>

        <!-- Preview Dialog -->
        <PreviewDialog
            v-model:open="store.showPreview"
            :preview-data="store.previewData"
            @confirm="handleConfirmPreview"
        />

        <!-- Messages -->
        <MessageDisplayPanel
            :messages="store.messages"
            @dismiss="handleDismissMessage"
        />
    </div>
</template>

<script>
import { useBatchManagerStore } from '@/stores/batchManagerStore';
import { inject } from 'vue';

export default {
    name: 'BatchManager',

    setup() {
        const store = useBatchManagerStore();

        // Inject services
        const searchService = inject('searchService');
        const validationService = inject('validationService');
        const previewService = inject('previewService');
        const batchOperationService = inject('batchOperationService');

        return {
            store,
            searchService,
            validationService,
            previewService,
            batchOperationService
        };
    },

    methods: {
        async handleSearch() {
            await this.store.executeSearch(this.searchService);
        },

        handleStopSearch() {
            // Implement stop logic
        },

        async handlePreview() {
            await this.store.generatePreview(
                this.previewService,
                this.validationService
            );
        },

        async handleExecute() {
            const validation = this.validationService.validateBatchOperation(
                this.store.workFiles,
                this.store.categoriesToAdd,
                this.store.categoriesToRemove
            );

            if (!validation.isValid) {
                this.store.addMessage({
                    type: 'warning',
                    text: validation.message
                });
                return;
            }

            if (!confirm(`Process ${validation.workFiles.length} files?`)) {
                return;
            }

            this.store.isProcessing = true;

            try {
                const results = await this.batchOperationService.execute(
                    validation.workFiles,
                    validation.categoriesToAdd,
                    validation.categoriesToRemove,
                    (progress) => {
                        this.store.progress = progress;
                    }
                );

                this.store.addMessage({
                    type: 'success',
                    text: `Completed: ${results.successful} successful, ${results.failed} failed`
                });
            } catch (error) {
                this.store.addMessage({
                    type: 'error',
                    text: error.message
                });
            } finally {
                this.store.isProcessing = false;
            }
        },

        handleStop() {
            // Implement stop logic
        },

        async handleConfirmPreview() {
            this.store.showPreview = false;
            await this.handleExecute();
        },

        handleDismissMessage(messageId) {
            const index = this.store.messages.findIndex(m => m.id === messageId);
            if (index > -1) {
                this.store.messages.splice(index, 1);
            }
        }
    }
};
</script>
```

### Phase 5: Service Initialization and Dependency Injection

#### 5.1 Create Service Container
```javascript
// services/ServiceContainer.js
class ServiceContainer {
    constructor() {
        this.services = new Map();
    }

    register(name, factory) {
        this.services.set(name, {
            factory,
            instance: null
        });
    }

    get(name) {
        const service = this.services.get(name);
        if (!service) {
            throw new Error(`Service ${name} not found`);
        }

        if (!service.instance) {
            service.instance = service.factory(this);
        }

        return service.instance;
    }
}

// Initialize services
function createServices() {
    const container = new ServiceContainer();

    // Infrastructure
    container.register('apiService', () => new APIService());
    container.register('rateLimiter', () => new RateLimiter());
    container.register('wikitextParser', () => new WikitextParser());

    // Domain Services
    container.register('categoryService', (c) =>
        new CategoryService(c.get('apiService'))
    );
    container.register('fileService', (c) =>
        new SearchService(c.get('apiService'))
    );

    // Application Services
    container.register('validationService', () =>
        new ValidationService()
    );
    container.register('searchService', (c) =>
        new SearchService(
            c.get('fileService'),
            c.get('validationService')
        )
    );
    container.register('previewService', (c) =>
        new PreviewService(c.get('validationService'))
    );
    container.register('batchOperationService', (c) =>
        new BatchOperationService(
            c.get('categoryService'),
            c.get('rateLimiter')
        )
    );
    container.register('categorySearchService', (c) =>
        new CategorySearchService(c.get('apiService'))
    );

    return container;
}
```

#### 5.2 Update Gadget Entry Point
```javascript
// gadget-entry.js
mw.loader.using(['@wikimedia/codex', 'mediawiki.api', 'vue']).then(function (require) {
    const target = document.getElementById('category-batch-manager2');
    if (!target) return;

    const Vue = require('vue');
    const Codex = require('@wikimedia/codex');
    const { createPinia } = require('pinia');

    // Create service container
    const services = createServices();

    // Create Vue app
    const app = Vue.createMwApp(BatchManager);

    // Add Pinia for state management
    app.use(createPinia());

    // Provide services
    app.provide('apiService', services.get('apiService'));
    app.provide('searchService', services.get('searchService'));
    app.provide('validationService', services.get('validationService'));
    app.provide('previewService', services.get('previewService'));
    app.provide('batchOperationService', services.get('batchOperationService'));
    app.provide('categorySearchService', services.get('categorySearchService'));

    // Register Codex components
    Object.entries(Codex).forEach(([name, component]) => {
        if (name.startsWith('Cdx')) {
            const kebabName = 'cdx-' + name.slice(3)
                .replace(/([A-Z])/g, '-$1')
                .toLowerCase();
            app.component(kebabName, component);
        }
    });

    app.mount('#category-batch-manager2');
});
```

## File Structure After Refactoring

```
src/
├── models/
│   ├── FileModel.js
│   └── CategoryOperation.js
│
├── services/
│   ├── infrastructure/
│   │   ├── APIService.js
│   │   ├── RateLimiter.js
│   │   └── WikitextParser.js
│   │
│   ├── domain/
│   │   ├── CategoryService.js
│   │   └── SearchService.js
│   │
│   ├── application/
│   │   ├── SearchService.js
│   │   ├── ValidationService.js
│   │   ├── PreviewService.js
│   │   ├── BatchOperationService.js
│   │   └── CategorySearchService.js
│   │
│   └── ServiceContainer.js
│
├── stores/
│   └── batchManagerStore.js
│
├── components/
│   ├── BatchManager.vue
│   ├── SearchPanel.vue
│   ├── CategoryInputsPanel.vue
│   ├── FilesList.vue
│   ├── ActionPanel.vue
│   ├── ProgressBar.vue
│   ├── PreviewDialog.vue
│   └── MessageDisplayPanel.vue
│
├── utils/
│   └── Validator.js
│
└── gadget-entry.js
```

## Benefits of This Refactoring

### 1. **Clear Separation of Concerns**
- **Presentation Layer:** Only UI rendering and user interaction
- **Application Layer:** Business logic and orchestration
- **Domain Layer:** Core business rules and models
- **Infrastructure Layer:** External dependencies and utilities

### 2. **Testability**
- Services can be unit tested independently
- No need to mock Vue components to test business logic
- Easy to mock dependencies using dependency injection

### 3. **Maintainability**
- Changes to business logic don't affect UI
- Changes to UI don't affect business logic
- Clear responsibilities make code easier to understand

### 4. **Reusability**
- Services can be reused in different contexts
- Business logic is framework-agnostic
- Easy to create different UIs using the same services

### 5. **Scalability**
- Easy to add new features
- Clear where new code should go
- Reduced coupling makes refactoring safer

## Migration Strategy

### Step 1: Set up infrastructure (Week 1)
- Create service container
- Set up Pinia store
- Create base service classes

### Step 2: Extract services (Week 2)
- Create ValidationService
- Create SearchService
- Create PreviewService
- Create BatchOperationService

### Step 3: Refactor components (Week 3)
- Convert handlers to services
- Create Vue components from class-based components
- Wire up dependency injection

### Step 4: Testing and cleanup (Week 4)
- Write unit tests for services
- Integration tests for components
- Remove old handler classes
- Update documentation

## Testing Strategy

### Unit Tests (Services)
```javascript
// tests/services/ValidationService.test.js
describe('ValidationService', () => {
    let validationService;

    beforeEach(() => {
        validationService = new ValidationService();
    });

    describe('validateSearchInputs', () => {
        it('should reject empty source category', () => {
            const result = validationService.validateSearchInputs('', 'pattern');
            expect(result.isValid).toBe(false);
            expect(result.message).toContain('source category');
        });

        it('should accept valid inputs', () => {
            const result = validationService.validateSearchInputs(
                'Category:Test',
                'pattern'
            );
            expect(result.isValid).toBe(true);
        });
    });
});
```

### Integration Tests (Components)
```javascript
// tests/components/BatchManager.test.js
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import BatchManager from '@/components/BatchManager.vue';

describe('BatchManager', () => {
    let wrapper;
    let mockSearchService;

    beforeEach(() => {
        mockSearchService = {
            executeSearch: jest.fn()
        };

        wrapper = mount(BatchManager, {
            global: {
                plugins: [createPinia()],
                provide: {
                    searchService: mockSearchService
                }
            }
        });
    });

    it('should call search service when search button clicked', async () => {
        await wrapper.find('.search-button').trigger('click');
        expect(mockSearchService.executeSearch).toHaveBeenCalled();
    });
});
```

## Conclusion

This refactoring plan transforms the codebase from a tightly-coupled, monolithic structure to a well-organized, layered architecture following the Separation of Concerns principle. The result will be more maintainable, testable, and scalable code that's easier to understand and modify.
