/**
 * Search panel Vue component — UI layer only.
 * Owns only what is needed to render and accept user input.
 * All business logic is delegated to SearchHandler via callbacks.
 *
 * State owned here:
 *   - sourceCategory, searchPattern  → user input fields
 *   - isSearching, searchProgressText, searchProgressPercent → reflect handler state
 *
 * State NOT owned here (lives in parent component or handler):
 *   - workFiles / previewRows        → passed up via onComplete callback
 *   - shouldStopSearch flag          → owned by SearchService, managed by SearchHandler
 *
 * @see https://doc.wikimedia.org/codex/latest/
 * @param {SearchHandler} search_handler
 * @returns {Object} Vue app configuration
 */
function SearchPanel(search_handler) {
    const app = {
        data() {
            return {
                search_handler: search_handler,

                // ── User inputs ──────────────────────────────────────────
                sourceCategory: 'Category:Our World in Data graphs of Austria',
                titlePattern: '1990',
                searchPattern: '',

                workFiles: [],
                // ── UI state (mirrors handler state via callbacks) ────────
                isSearching: false,
                searchProgressText: '',
                searchProgressPercent: 0,
            };
        },

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
                            placeholder="Category:Our World in Data graphs of Austria" />
                    </div>
                    <div class="cbm-input-group cbm-column-one-third">
                        <cdx-label
                            input-id="cbm-title-pattern"
                            class="cbm-label">
                            In title Pattern
                        </cdx-label>
                        <cdx-text-input
                            id="cbm-title-pattern"
                            v-model="titlePattern"
                            placeholder="(e.g., ,BLR.svg)" />
                    </div>
                </div>

                <div class="cbm-input-group">
                    <cdx-label
                        input-id="cbm-pattern"
                        class="cbm-label">
                        Or Search Pattern
                    </cdx-label>
                    <span class="cbm-help-text">
                        (e.g., <code>
                        incategory:"CC-BY-4.0" "This chart is intentionally showing old data" Our World in Data -incategory:"Uploaded by OWID importer tool"</code>)</span
                    >
                    <div class="cbm-input-button-group">
                        <cdx-text-input
                            id="cbm-pattern"
                            v-model="searchPattern"
                            placeholder="" />
                        <cdx-button
                            v-if="!isSearching"
                            @click="searchFiles"
                            action="progressive"
                            weight="primary">
                            Search
                        </cdx-button>
                        <cdx-button
                            v-if="isSearching"
                            @click="stopSearch"
                            action="destructive"
                            weight="primary">
                            Stop Search
                        </cdx-button>
                    </div>
                </div>
            </div>
        `,
        progress_template: `
            <div v-if="searchProgressPercent > 0 || searchProgressText !== ''"
                    class="cbm-progress-section">
                <div class="cbm-progress-bar-bg">
                    <div class="cbm-progress-bar-fill"
                            :style="{ width: searchProgressPercent + '%' }">
                    </div>
                </div>
                <div class="cbm-progress-text">
                    {{ searchProgressText }}
                </div>
            </div>
        `,

        methods: {
            /**
             * Initiate a file search.
             * Registers callbacks on the handler then delegates the work.
             */
            async searchFiles() {
                if (this.sourceCategory.trim() === '' && this.searchPattern.trim() === '') {
                    this.showWarningMessage('Please enter a source category or search pattern.');
                    return;
                }

                // Wire up handler callbacks before starting
                this.search_handler.onProgress = (text, percent) => {
                    this.searchProgressText = text;
                    this.searchProgressPercent = percent;
                };

                this.search_handler.onComplete = (results) => {
                    this.clearStatus();
                    this.workFiles = results || [];
                    // Bubble results up to the parent component
                };

                this.search_handler.onError = (error) => {
                    this.clearStatus();
                    this.showWarningMessage(`Search failed: ${error.message}`);
                };

                this.isSearching = true;
                this.searchProgressText = '';
                this.searchProgressPercent = 0;

                // Clear all files and messages from previous search
                this.workFiles = [];

                await this.search_handler.startSearch(this.sourceCategory, this.titlePattern, this.searchPattern);
            },

            /**
             * Ask the handler to abort the current search.
             * UI state is reset once the handler fires onComplete/onError.
             */
            stopSearch() {
                this.clearStatus();

                this.search_handler.stop();
                this.showWarningMessage('Search stopped by user.');
            },
            clearStatus() {
                this.isSearching = false;
                this.searchProgressText = '';
                this.searchProgressPercent = 0;
            },
        }
    };

    return app;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchPanel;
}
