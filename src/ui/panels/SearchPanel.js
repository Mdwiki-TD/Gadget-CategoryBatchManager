/**
 * Search panel — UI layer only.
 * All business logic is delegated to SearchHandler.
 * @returns {Object} Partial Vue app configuration (data + template + methods)
 */

function SearchPanel() {
    return {
        props: {
            searchHandler: {
                type: Object,
                required: true
            },
            defaultCategory: {
                type: String,
                default: ''
            }
        },
        data() {
            return {

                // ── User inputs ──────────────────────────────────────────
                sourceCategory: this.defaultCategory,
                titlePattern: '',
                searchPattern: '',
                searchLimit: 5000,

                workFiles: [],
                // ── UI state (mirrors handler state via callbacks) ────────
                isSearching: false,
                searchProgressText: '',
                searchProgressPercent: 0,
            };
        },
        emits: ['show-warning-message', 'update:work-files'],

        template: `
            <div class="cbm-search-panel">
                <div class="cbm-input-group cbm-two-column-row">
                    <div class="cbm-input-group cbm-column-two-thirds">
                        <cdx-label
                            input-id="cbm-source-category"
                            class="cbm-label">
                            Source Category
                        </cdx-label>
                        <cdx-text-input
                            id="cbm-source-category"
                            v-model="sourceCategory"
                            :disabled="searchPattern.trim() !== ''"
                            placeholder="Category:Our World in Data graphs of Austria" />
                    </div>
                    <div class="cbm-input-group cbm-column-one-third">
                        <cdx-label
                            input-id="cbm-title-pattern"
                            class="cbm-label">
                            In-title pattern
                        </cdx-label>
                        <cdx-text-input
                            id="cbm-title-pattern"
                            v-model="titlePattern"
                            :disabled="searchPattern.trim() !== ''"
                            placeholder="e.g. ,BLR.svg" />
                    </div>
                </div>
                <div class="cbm-input-group">
                    <cdx-label
                        input-id="cbm-search-pattern"
                        class="cbm-label">
                        Or search pattern
                    </cdx-label>
                    <span class="cbm-help-text">
                        (e.g., <code>
                        incategory:"CC-BY-4.0" Our World in Data -incategory:"Uploaded by OWID importer tool"</code>)
                    </span>
                    <div class="cbm-input-button-group">
                        <cdx-text-input
                            id="cbm-search-pattern"
                            v-model="searchPattern"
                            placeholder="" />
                        <cdx-text-input
                            id="cbm-search-limit"
                            v-model.number="searchLimit"
                            type="number"
                            min="1"
                            max="10000"
                            class="cbm-limit-input"
                            placeholder="Limit" />
                        <cdx-button
                            v-if="!isSearching"
                            action="progressive"
                            weight="primary"
                            @click="searchFiles">
                            Search
                        </cdx-button>
                        <cdx-button
                            v-if="isSearching"
                            action="destructive"
                            weight="primary"
                            @click="stopSearch">
                            Stop
                        </cdx-button>
                    </div>
                </div>
            </div>
        `,

        methods: {
            /**
             * Initiate a file search.
             * Registers callbacks on the handler then delegates the work.
             */
            async searchFiles() {
                if (!this.sourceCategory.trim() && !this.searchPattern.trim()) {
                    this.$emit('show-warning-message', 'Please enter a source category or search pattern.');
                    return;
                }

                // Wire up handler callbacks before starting
                this.searchHandler.onProgress = (text, percent) => {
                    this.searchProgressText = text;
                    this.searchProgressPercent = percent;
                };

                this.searchHandler.onComplete = (results) => {
                    this._clearSearchStatus();
                    this.workFiles = results ?? [];
                    // Bubble results up to the parent component
                    this.$emit('update:work-files', this.workFiles);
                };

                this.searchHandler.onError = (error) => {
                    this._clearSearchStatus();
                    this.$emit('show-warning-message', `Search failed: ${error.message}`);
                };

                this.isSearching = true;
                this.searchProgressText = '';
                this.searchProgressPercent = 0;

                // Clear all files and messages from previous search
                this.workFiles = [];
                this.$emit('update:work-files', this.workFiles);

                await this.searchHandler.startSearch(
                    this.sourceCategory,
                    this.titlePattern,
                    this.searchPattern,
                    this.searchLimit
                );
            },

            /**
             * Ask the handler to abort the current search.
             * UI state is reset once the handler fires onComplete/onError.
             */
            stopSearch() {
                this._clearSearchStatus();
                this.searchHandler.stop();
                this.$emit('show-warning-message', 'Search stopped by user.');
            },

            _clearSearchStatus() {
                this.isSearching = false;
                this.searchProgressText = '';
                this.searchProgressPercent = 0;
            },
        },
    };
}

export default SearchPanel;
