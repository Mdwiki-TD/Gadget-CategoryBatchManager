/**
 * Creates the Vue app definition for the Category Batch Manager tool.
 * @returns {Object} Vue app definition object.
 */
/* global APIService, SearchHandler, CategoryInputs, FilesList, ProgressBar */

function BatchManager() {
    const mwApi = new APIService();
    const search_handler = new SearchHandler();
    const category_inputs = new CategoryInputs(mwApi);
    const files_list = new FilesList(mwApi);
    const progress_section = new ProgressBar();
    const file_service = new FileService(mwApi);
    const execute_handler = new ExecuteHandler(mwApi);
    const preview_handler = new PreviewHandler();

    const Search_SectionHtml = search_handler.createElement();
    const CategoryInputPanelHtml = category_inputs.createElement();
    const FilesListHtml = files_list.createElement();
    const ProgressSectionHtml = progress_section.createElement();
    const ExecuteSectionHtml = execute_handler.createElement();
    const PreviewChangesHtml = preview_handler.createElement();

    const template = `
        <div class="cbm-container">
        <h2 class="cbm-title">
            Category Batch Manager
        </h2>

        <div class="cbm-grid">
            <!-- Left Panel: Search and Actions -->
            <div>
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

                    <div class="cbm-selected-info">
                        Selected: <strong>{{ selectedCount }}</strong> files
                    </div>

                    <div class="cbm-button-group">
                        ${PreviewChangesHtml}
                        ${ExecuteSectionHtml}
                    </div>
                </div>
                <!-- Progress Section -->
                ${ProgressSectionHtml}
            </div>

            <!-- Right Panel: File List -->
            <div>
                ${FilesListHtml}
            </div>
        </div>
    </div>

    <!-- Message Display -->
    <div v-if="showMessage" class="cbm-fixed-message">
        <cdx-message :type="messageType" :fade-in="true" :auto-dismiss="messageType === 'success'" :display-time="3000"
            dismiss-button-label="Close" @dismissed="handleMessageDismiss">
            {{ messageContent }}
        </cdx-message>
    </div>
    `;

    const app = {
        data: function () {
            return {
                execute_handler: execute_handler,
                preview_handler: preview_handler,
                search_handler: search_handler,
                file_service: file_service,
                category_inputs: category_inputs,
                files_list: files_list,

                mwApi: mwApi, // Reference to API service instance
                sourceCategory: 'Category:Our World in Data graphs of Austria',
                searchPattern: '1990',
                addCategories: [],
                addInputValue: '',
                removeInputValue: '',
                removeCategories: [],
                editSummary: 'Batch category update via Category Batch Manager',
                searchResults: [],
                selectedFiles: [],
                showMessage: false,
                messageType: '',
                messageContent: '',
                showProgress: false,
                progressPercent: 0,
                progressText: 'Processing...',
                isSearching: false,
                isProcessing: false,
                shouldStopProgress: false,
                shouldStopSearch: false,

                showAddCategoryMessage: false,
                addCategoryMessageType: '',
                addCategoryMessageText: '',

                showRemoveCategoryMessage: false,
                removeCategoryMessageType: '',
                removeCategoryMessageText: '',

                showResultsMessage: false,
                resultsMessageText: '',

                previewRows: [],
                changesCount: '',
                previewHtml: '',
                openPreviewHandler: false,

                // For multiselect lookup - Add Categories
                addCategoryChips: [],
                addCategoryMenuItems: [
                    // { value: 'Category:Economics', label: 'Category:Economics' },
                    // { value: 'Category:Science', label: 'Category:Science' }
                ],
                addCategoryMenuConfig: {
                    boldLabel: true,
                    visibleItemLimit: 10
                },

                // For multiselect lookup - Remove Categories
                removeCategoryChips: [],
                removeCategoryMenuItems: [
                    // { value: 'Category:Politics', label: 'Category:Politics' }
                ],
                removeCategoryMenuConfig: {
                    boldLabel: true,
                    visibleItemLimit: 10
                },

            };
        },
        computed: {
            selectedCount: function () {
                return this.selectedFiles.filter(f => f.selected).length;
            },
            totalFilesCount: function () {
                return this.selectedFiles.length;
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
                return this.files_list.selectAll(this.selectedFiles);
            },

            // should be moved to `class FilesList` at `ui/components/FilesList.js`
            // Deselect all files
            deselectAll: function () {
                return this.files_list.deselectAll(this.selectedFiles);
            },

            // should be moved to `class FilesList` at `ui/components/FilesList.js`
            // Remove individual file from list
            removeFile: function (index) {
                this.selectedFiles.splice(index, 1);
                if (this.selectedFiles.length === 0) {
                    this.showResultsMessage = false;
                }
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

            // Process files sequentially
            processBatch: function (files, index) {
                return this.execute_handler.processBatch(this, files, index);
            },

            // Stop ongoing operation
            stopOperation: function () {
                return this.execute_handler.stopOperation(this);
            },

            /* *************************
            **      CategoryInputs
            ** *************************
            */
            displayCategoryMessage: function (text, type, msg_type = 'add') {
                return this.category_inputs.displayCategoryMessage(this, text, type, msg_type);
            },
            hideCategoryMessage: function (msg_type = 'add') {
                return this.category_inputs.hideCategoryMessage(this, msg_type);
            },
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
                this.showMessage = false;
                this.messageType = '';
                this.messageContent = '';
            },

            showWarningMessage: function (message) {
                this.messageType = 'warning';
                this.messageContent = message;
                this.showMessage = true;
            },

            showErrorMessage: function (message) {
                this.messageType = 'error';
                this.messageContent = message;
                this.showMessage = true;
            },

            showSuccessMessage: function (message) {
                this.messageType = 'success';
                this.messageContent = message;
                this.showMessage = true;
            },

            handleMessageDismiss: function () {
                this.showMessage = false;
            }
        },
        template: template
    };
    return app;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BatchManager;
}
