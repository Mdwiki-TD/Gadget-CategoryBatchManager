/**
 * Execute Panel Vue app factory
 * UI component only - delegates business logic to handlers
 * @see https://doc.wikimedia.org/codex/latest/
 * @param {Object} search_handler - SearchHandler instance
 * @returns {Object} Vue app configuration
 */

function SearchPanel(search_handler) {
    const app = {
        data: function () {
            return {
                search_handler: search_handler,

                sourceCategory: 'Category:Our World in Data graphs of Austria',
                searchPattern: '1990',

                workFiles: [],
                // Processing state
                isSearching: false,
                searchProgressText: '',
                searchProgressPercent: 0,
            };
        },
        template: `
            <div class="cbm-search-panel">
                <div class="cbm-input-group">
                    <cdx-label input-id="cbm-source-category" class="cbm-label">
                        Source Category
                    </cdx-label>
                    <cdx-text-input id="cbm-source-category" v-model="sourceCategory"
                        placeholder="Category:Our World in Data graphs of Austria" />
                </div>

                <div class="cbm-input-group">
                    <cdx-label input-id="cbm-pattern" class="cbm-label">
                        Search Pattern
                    </cdx-label>
                    <span class="cbm-help-text">
                        Enter a pattern to filter files (e.g., ,BLR.svg)
                    </span>
                    <div class="cbm-input-button-group">
                        <cdx-text-input id="cbm-pattern" v-model="searchPattern" placeholder="e.g., ,BLR.svg" />
                        <cdx-button v-if="!isSearching" @click="searchFiles" action="progressive" weight="primary">
                            Search
                        </cdx-button>
                        <cdx-button v-if="isSearching" @click="stopSearch" action="destructive" weight="primary">
                            Stop Search
                        </cdx-button>
                    </div>
                </div>
            </div>
        `,
        progress_template: `
            <div v-if="searchProgressPercent > 0 || searchProgressText !== ''" class="cbm-progress-section">
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
             * Start file search operation
             */
            async searchFiles() {
                if (this.sourceCategory.trim() === '') {
                    this.showWarningMessage('Please enter a source category.');
                    return;
                }

                this.isSearching = true;
                // NOTE: searchProgressText didn't hide after search finished
                this.searchProgressText = 'Searching for files...';
                this.searchProgressPercent = 0;

                // Clear all files and messages from previous search
                this.workFiles = [];

                const searchResults = await this.search_handler.startSearch(this.sourceCategory, this.searchPattern);
                this.workFiles = searchResults || [];

                this.clearStatus();
            },

            /**
             * Stop ongoing batch operation
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
