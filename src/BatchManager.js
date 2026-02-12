/**
 * Assemble the full Vue app from panels and services.
 * Returns only the inner template - use BatchManagerDialog or BatchManagerStandalone for wrappers.
 * @returns {Object} Vue component definition
 */

import { APIService, BatchProcessor, CategoryService, SearchService } from './services';
import { CategoryInputsPanel, ExecutePanel, FilesListPanel, MessageDisplayPanel, PreviewPanel, SearchPanel } from './ui/panels';
import { CategoryInputsHandler, ExecuteHandler, FileListHandler, SearchHandler, ProgressHandler } from './ui/handlers';
import CategoryLookup from './ui/components/CategoryLookup.js';
import PreviewTable from './ui/components/PreviewTable.js';
import { ChangesHelper, ValidationHelper } from './ui/helpers';

function BatchManager() {
    // ── Services ──────────────────────────────────────────────────────────
    const api = new APIService();
    const search_service = new SearchService(api);
    const categoryService = new CategoryService(api);
    const batchProcessor = new BatchProcessor(categoryService);

    // ── Helpers ───────────────────────────────────────────────────────────
    const validation_helper = new ValidationHelper();
    const changes_helpers = new ChangesHelper(validation_helper);

    // ── Handlers ──────────────────────────────────────────────────────────
    const search_handler = new SearchHandler(search_service);
    const progress_handler = new ProgressHandler();
    const execute_handler = new ExecuteHandler(batchProcessor);
    const category_inputs_handler = new CategoryInputsHandler(api);

    // ── Panel configurations ──────────────────────────────────────────────
    const search_panel = SearchPanel(search_handler);

    // ── Template ─────────────────────────────────────────────────────────
    const template = `
        <div class="cbm-main-layout">
            <!-- Left Panel: Search and Actions -->
            <div class="cbm-left-panel">
                <!-- Search Section -->
                ${search_panel.template}

                <!-- Actions Section -->
                <div>
                    <CategoryInputsPanel
                        :add-category="addCategory"
                        :remove-category="removeCategory"
                        :handler="category_inputs_handler"
                    />

                    <div class="cbm-button-group">
                        <PreviewPanel
                            :is-processing="isProcessing"
                            :source-category="sourceCategory"
                            :selected-files="selectedFiles"
                            :add-category-selected="addCategory.selected"
                            :remove-category-selected="removeCategory.selected"
                            :changes-helpers="changes_helpers"
                            @display-message="displayCategoryMessage"
                        />
                        <ExecutePanel
                            :execute-handler="execute_handler"
                            :progress-handler="progress_handler"
                            :changes-helpers="changes_helpers"
                            :source-category="sourceCategory"
                            :selected-files="selectedFiles"
                            :add-category-selected="addCategory.selected"
                            :remove-category-selected="removeCategory.selected"
                            @display-message="displayCategoryMessage"
                            @show-warning-message="showWarningMessage"
                            @show-success-message="showSuccessMessage"
                            @show-error-message="showErrorMessage"
                        />
                    </div>
                </div>
            </div>

            <!-- Right Panel: File List -->
            <div class="cbm-right-panel">
                <FilesListPanel :work-files="workFiles" />

                <!-- Progress Section -->
                ${search_panel.progressTemplate}
            </div>
        </div>
        <!-- Message Display -->
        <MessageDisplayPanel />
    `;

    // ── Helper to create lookup model ─────────────────────────────────────
    const createLookupModel = () => ({
        menuItems: [],
        menuConfig: { boldLabel: true, visibleItemLimit: 10 },
        chips: [],
        selected: [],
        input: '',
        message: { show: false, type: '', text: '', key: 0 },
    });

    // ── App definition ────────────────────────────────────────────────────
    const app = {
        data() {
            return {
                category_inputs_handler: category_inputs_handler,
                execute_handler: execute_handler,
                progress_handler: progress_handler,
                changes_helpers: changes_helpers,
                search_handler: search_handler,

                // Category state (owned by parent)
                addCategory: createLookupModel(),
                removeCategory: createLookupModel(),

                // Merge other panel states
                ...search_panel.data(),
            };
        },

        computed: {
            selectedFiles: function() {
                return this.workFiles.filter(f => f.selected);
            },
            selectedCount: function() {
                return this.workFiles.filter(f => f.selected).length;
            }
        },

        methods: {
            ...search_panel.methods,

            // Helper for CategoryInputsPanel
            displayCategoryMessage(text, type = 'error', target = 'add') {
                const model = target === 'add' ? this.addCategory : this.removeCategory;
                model.message.show = false;
                this.$nextTick(() => {
                    model.message.type = type;
                    model.message.text = text;
                    model.message.show = true;
                    model.message.key++;
                });
            },
        },

        components: {
            CategoryLookup: CategoryLookup(),
            PreviewTable: PreviewTable(),
            MessageDisplayPanel: MessageDisplayPanel(),
            FilesListPanel: FilesListPanel(),
            CategoryInputsPanel: CategoryInputsPanel(),
            PreviewPanel: PreviewPanel(),
            ExecutePanel: ExecutePanel(),
        },
        template: template,
    };

    return app;
}

export default BatchManager;
