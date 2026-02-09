/**
 * Creates the Vue app definition for the Category Batch Manager tool.
 * @returns {Object} Vue app definition object.
 */
/* global APIService, SearchHandler, CategoryInputs, FilesList, SearchProgressBar, MessageDisplay */

function BatchManager() {
    const mwApi = new APIService();
    const search_handler = new SearchHandler();
    const messages_component = new CategoryInputsMessages();
    const category_inputs = new CategoryInputs(mwApi, messages_component);
    const files_list = new FilesList(mwApi);
    const progress_section = new SearchProgressBar();
    const file_service = new FileService(mwApi);
    const execute_handler = new ExecuteHandler(mwApi);
    const preview_handler = new PreviewHandler();
    const message_display = new MessageDisplay();

    const Search_SectionHtml = search_handler.createElement();
    const CategoryInputPanelHtml = category_inputs.createElement();
    const FilesListHtml = files_list.createElement();
    const ProgressSectionHtml = progress_section.createElement();
    const MessageDisplayHtml = message_display.createElement();
    const ExecuteSectionHtml = execute_handler.createElement();
    const PreviewChangesHtml = preview_handler.createElement();

    const template = `
        <div class="cbm-container">
            <h2 class="cbm-title">
                Category Batch Manager
            </h2>

            <div class="cbm-main-layout">
                <!-- Left Panel: Search and Actions -->
                <div class="cbm-left-panel">
                    <!-- Search Section -->
                    ${Search_SectionHtml}

                    <!-- Actions Section -->
                    <div>
                        ${CategoryInputPanelHtml}

                        <div class="margin-bottom-20">
                            <cdx-label input-id="cbm-summary" class="cbm-label">
                                Edit Summary
                            </cdx-label>
                            <cdx-text-input id="cbm-summary" v-model="editSummary" />
                        </div>

                        <div class="cbm-button-group">
                            ${PreviewChangesHtml}
                            ${ExecuteSectionHtml}
                        </div>
                    </div>
                </div>

                <!-- Right Panel: File List -->
                <div class="cbm-right-panel">
                    ${FilesListHtml}

                    <!-- Progress Section -->
                    ${ProgressSectionHtml}
                </div>
            </div>
            <!-- Message Display -->
            ${MessageDisplayHtml}
        </div>
    `;

    const app = {
        data: function () {
            const app_data = {
                execute_handler: execute_handler,
                message_display: message_display,
                preview_handler: preview_handler,
                search_handler: search_handler,
                file_service: file_service,
                category_inputs: category_inputs,
                messages_component: messages_component,
                files_list: files_list,
                mwApi: mwApi, // Reference to API service instance

                editSummary: 'Batch category update via Category Batch Manager',

                // SearchHandler state
                sourceCategory: 'Category:Our World in Data graphs of Austria',
                searchPattern: '1990',
                searchResults: [],

                // FilesList state
                workFiles: [],

                // MessageDisplay state
                showMessage: false,
                messageType: '',
                messageContent: '',

                // SearchProgressBar state
                showSearchProgress: false,
                searchProgressPercent: 0,
                searchProgressText: '',

                // SearchHandler state
                isSearching: false,
                shouldStopSearch: false,

                // ExecuteHandler state
                openConfirmDialog: false,
                confirmDefaultAction: { label: 'Cancel' },
                confirmPrimaryAction: { label: 'Save', actionType: 'progressive' },
                confirmMessage: "",

                // ExecuteHandler state
                showExecutionProgress: false,
                executionProgressText: 'Processing...',
                executionProgressPercent: 0,

                isProcessing: false,
                shouldStopProgress: false,

                // PreviewHandler state
                previewRows: [],
                changesCount: '',
                openPreviewHandler: false,

                addCategory: {
                    menuItems: [],
                    menuConfig: {
                        boldLabel: true,
                        visibleItemLimit: 10
                    },
                    chips: [],
                    selected: [],
                    input: "",
                    message: {
                        show: false,
                        type: "",
                        text: "",
                    },
                },
                removeCategory: {
                    menuItems: [],
                    menuConfig: {
                        boldLabel: true,
                        visibleItemLimit: 10
                    },
                    chips: [],
                    selected: [],
                    input: "",
                    message: {
                        show: false,
                        type: "",
                        text: "",
                    },
                },
            };
            return app_data;
        },
        computed: {
            selectedCount: function () {
                return this.workFiles.filter(f => f.selected).length;
            },
            selectedFiles: function () {
                return this.workFiles.filter(f => f.selected);
            },
            totalFilesCount: function () {
                return this.workFiles.length;
            }
        },
        methods: {
            /* *************************
            **      FileService
            ** *************************
            */

            searchFiles: function () {
                return this.search_handler.searchFiles(this);
            },
            stopSearch: function () {
                return this.search_handler.stopSearch(this);
            },

            /* *************************
            **      FilesList
            ** *************************
            */

            // should be moved to `class FilesList` at `ui/components/FilesList.js`
            // Select all files
            selectAll: function () {
                return this.files_list.selectAll(this.workFiles);
            },

            // should be moved to `class FilesList` at `ui/components/FilesList.js`
            // Deselect all files
            deselectAll: function () {
                return this.files_list.deselectAll(this.workFiles);
            },

            // should be moved to `class FilesList` at `ui/components/FilesList.js`
            // Remove individual file from list
            removeFile: function (index) {
                this.workFiles.splice(index, 1);
            },

            // Preview changes before executing
            handlePreview: function () {
                return this.preview_handler.handlePreview(this);
            },

            /* *************************
            **      ExecuteHandler
            ** *************************
            */

            // Execute batch operation
            executeOperation: function () {
                return this.execute_handler.executeOperation(this);
            },

            ConfirmOnPrimaryAction: function () {
                return this.execute_handler.ConfirmOnPrimaryAction(this);
            },
            // Process files sequentially
            processBatch: function (files, index) {
                return this.execute_handler.processBatch(this, files, index);
            },

            // Stop ongoing operation
            stopOperation: function () {
                return this.execute_handler.stopOperation(this);
            },

            /* *************************
            **  CategoryInputsMessages
            ** *************************
            */
            displayCategoryMessage: function (text, type, msg_type = 'add') {
                return this.messages_component.displayCategoryMessage(this, text, type, msg_type);
            },
            hideCategoryMessage: function (msg_type = 'add') {
                return this.messages_component.hideCategoryMessage(this, msg_type);
            },

            /* *************************
            **      CategoryInputs
            ** *************************
            */
            onAddCategoryInput: function (value) {
                return this.category_inputs.onAddCategoryInput(this, value);
            },
            onRemoveCategoryInput: function (value) {
                return this.category_inputs.onRemoveCategoryInput(this, value);
            },
            addOnLoadMore: function () {
                return this.category_inputs.addOnLoadMore(this);
            },
            removeOnLoadMore: function () {
                return this.category_inputs.removeOnLoadMore(this);
            },

            /* *************************
            **      Message Handlers
            ** *************************
            */

            // Message handlers
            resetMessageState: function () {
                this.message_display.resetMessageState();
            },

            renderMessage: function (message, type = 'info') {
                this.message_display.renderMessage(message, type);
            },

            showWarningMessage: function (message) {
                this.message_display.showWarningMessage(message);
            },

            showErrorMessage: function (message) {
                this.message_display.showErrorMessage(message);
            },

            showSuccessMessage: function (message) {
                this.message_display.showSuccessMessage(message);
            },

            handleMessageDismiss: function () {
                this.message_display.handleMessageDismiss();
            }
        },
        template: template
    };
    return app;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BatchManager;
}
