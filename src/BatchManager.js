/**
 * Assemble the full Vue app from panels and services.
 * Returns only the inner template - use BatchManagerDialog or BatchManagerStandalone for wrappers.
 * @returns {Object} Vue component definition
 */

import { APIService, BatchProcessor, CategoryService, SearchService } from './services';
import { CategoryInputsPanel, ExecutePanel, FilesListPanel, MessageDisplayPanel, PreviewPanel, SearchPanel } from './ui/panels';
import { CategoryInputsHandler, ExecuteHandler, SearchHandler, ProgressHandler } from './ui/handlers';
import CategoryLookup from './ui/components/CategoryLookup.js';
import PreviewTable from './ui/components/PreviewTable.js';
import ProgressBar from './ui/components/ProgressBar.js';
import { ChangesHelper, ValidationHelper } from './ui/helpers';
import mw from './services/mw.js';

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
    const defaultCategory =
        mw.config.get('wgCanonicalNamespace') === 'Category'
            ? mw.config.get('wgPageName')
            : "";
    const message_display_panel = MessageDisplayPanel();

    // ── Template ─────────────────────────────────────────────────────────
    const template = `
        <div :class="filesIsCollapsed ? 'cbm-main-layout-expandable' : 'cbm-main-layout-grid'">
            <!-- Left Panel: Search and Actions -->
            <div class="cbm-left-panel-grid">
                <!-- Search Section -->
                <SearchPanel
                    :search-handler="search_handler"
                    :default-category="defaultCategory"
                    :api="api"
                    @show-warning-message="showWarningMessage"
                    @update:work-files="onWorkFilesUpdate"
                    @update:source-category="sourceCategory = $event"
                    @update:search-progress-percent="searchProgressPercent = $event"
                    @update:search-progress-text="searchProgressText = $event" />

                <!-- Search Progress Section -->
                <ProgressBar v-if="filesIsCollapsed"
                    :visible="searchProgressPercent > 0"
                    :percent="searchProgressPercent"
                    :text="searchProgressText" />

                <!-- Actions Section -->
                <div>
                    <CategoryInputsPanel
                        :add-category="addCategory"
                        :remove-category="removeCategory"
                        :handler="category_inputs_handler" />

                    <div class="cbm-button-group">
                        <PreviewPanel
                            :is-processing="isProcessing"
                            :source-category="sourceCategory"
                            :selected-files="selectedFiles"
                            :add-category-selected="addCategory.selected"
                            :remove-category-selected="removeCategory.selected"
                            :changes-helpers="changes_helpers"
                            @display-message="displayCategoryMessage" />
                        <ExecutePanel
                            :execute-handler="execute_handler"
                            :progress-handler="progress_handler"
                            :changes-helpers="changes_helpers"
                            :source-category="sourceCategory"
                            :selected-files="selectedFiles"
                            :add-category="addCategory"
                            :remove-category="removeCategory"
                            @display-message="displayCategoryMessage"
                            @show-warning-message="showWarningMessage"
                            @show-success-message="showSuccessMessage"
                            @show-error-message="showErrorMessage"
                            @update:is-processing="isProcessing = $event"
                            @update:progress-percent="
                                executionProgressPercent = $event
                            "
                            @update:progress-text="executionProgressText = $event"
                            @execution-complete="handleExecutionComplete" />
                    </div>
                </div>
                <!-- Execute Progress Section -->
                <ProgressBar
                    :visible="isProcessing"
                    :percent="executionProgressPercent"
                    :text="executionProgressText" />
            </div>

            <!-- Right Panel: File List -->
            <div class="cbm-right-panel-grid" v-if="!filesIsCollapsed">
                <FilesListPanel
                    :work-files="workFiles"
                />

                <!-- Search Progress Section -->
                <ProgressBar
                    :visible="searchProgressPercent > 0"
                    :percent="searchProgressPercent"
                    :text="searchProgressText" />
            </div>
        </div>
        <!-- Message Display -->
        <div
            v-if="showMessage"
            class="cbm-fixed-message">
            <cdx-message
                :key="messageKey"
                allow-user-dismiss
                :type="messageType"
                :fade-in="true"
                :auto-dismiss="true"
                :display-time="3000"
                dismiss-button-label="Close"
                @dismissed="handleMessageDismiss">
                {{ messageContent }}
            </cdx-message>
        </div>
    `;
    // ── Helper to create lookup model ─────────────────────────────────────
    const createLookupModel = () => ({
        menuItems: [],
        menuConfig: { boldLabel: true, visibleItemLimit: 10 },
        chips: [],
        selected: [],
        input: "",
        message: { show: false, type: "", text: "", key: 0 },
    });

    // ── App definition ────────────────────────────────────────────────────
    const app = {
        props: {
            filesIsCollapsed: {
                type: Boolean,
                default: false
            }
        },
        data() {
            return {
                api: api,
                category_inputs_handler: category_inputs_handler,
                execute_handler: execute_handler,
                progress_handler: progress_handler,
                changes_helpers: changes_helpers,
                search_handler: search_handler,

                // Category state (owned by parent)
                addCategory: createLookupModel(),
                removeCategory: createLookupModel(),
                workFiles: [],

                // Execution progress state (for ProgressBar)
                isProcessing: false,
                executionProgressPercent: 0,
                executionProgressText: "",

                // Search progress state (synced from SearchPanel)
                sourceCategory: defaultCategory,
                defaultCategory: defaultCategory,
                searchProgressPercent: 0,
                searchProgressText: "",

                // Merge message display state
                ...message_display_panel.data(),
            };
        },

        computed: {
            selectedFiles: function () {
                return this.workFiles.filter(f => f.selected);
            },
            selectedCount: function () {
                return this.workFiles.filter(f => f.selected).length;
            }
        },

        emits: ['execution-complete', 'update:work-files'],

        methods: {
            ...message_display_panel.methods,

            // Handle work files update - emit to parent
            onWorkFilesUpdate(files) {
                this.workFiles = files;
                this.$emit('update:work-files', files);
            },

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

            // Handle execution completion - pass through to parent
            handleExecutionComplete(results) {
                this.$emit('execution-complete', results);
            },
        },

        components: {
            SearchPanel: SearchPanel(),
            CategoryLookup: CategoryLookup(),
            PreviewTable: PreviewTable(),
            ProgressBar: ProgressBar(),
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
