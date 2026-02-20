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
            },
            api: {
                type: Object,
                required: true
            }
        },
        data() {
            return {

                // ── User inputs ──────────────────────────────────────────
                sourceCategory: this.defaultCategory,
                titlePattern: '',
                searchPattern: '',
                searchLimit: 50,

                workFiles: [],
                // ── UI state (mirrors handler state via callbacks) ────────
                isSearching: false,
                searchProgressText: '',
                searchProgressPercent: 0,

                // ── Category lookup state ───────────────────────────────
                categoryMenuItems: [],
                categoryMenuConfig: { boldLabel: true, visibleItemLimit: 10 },
                selectedCategory: '',
            };
        },
        emits: ['show-warning-message', 'update:work-files', 'update:source-category', 'update:search-progress-percent', 'update:search-progress-text'],

        template: `
    <div class="cbm-search-panel">
        <div class="cdx-fields-3by4">
            <!-- :status="weightStatus"
                :messages="weightMessages" -->
            <cdx-field
                class="cdx-field-3by4-3"
                >
                <template #label>
                    Source Category
                </template>
                <template #description></template>
                <cdx-lookup
                    v-model:input-value="sourceCategory"
                    v-model:selected="selectedCategory"
                    :menu-items="categoryMenuItems"
                    :menu-config="categoryMenuConfig"
                    :disabled="searchPattern.trim() !== ''"
                    placeholder=""
                    aria-label="Source Category"
                    @input="onCategoryInput">
                    <template #default="{ menuItem }">
                        {{ menuItem.label }}
                    </template>
                    <template #no-results> No results found </template>
                </cdx-lookup>
            </cdx-field>
            <cdx-field
                class="cdx-field-3by4-1"
            >
                <template #label> In-title pattern </template>
                <template #description></template>
                <template #help-text> </template>
                <cdx-text-input
                    v-model="titlePattern"
                    :disabled="searchPattern.trim() !== ''"
                    placeholder="e.g. ,BLR.svg" />
            </cdx-field>
        </div>

        <div class="cdx-fields cdx-fields-second-set">
            <cdx-field
                class="cbm-column-two-thirds"
                >
                <template #label> Or search pattern </template>
                <template #description></template>
                <cdx-text-input
                    id="cbm-search-pattern"
                    v-model="searchPattern"
                    placeholder="" />
                <template #help-text>
                (e.g., <code> incategory:"CC-BY-4.0" intitle:/Fair/</code >)
                </template>
            </cdx-field>
            <cdx-field
                class="cbm-column-one-third"
            >
                <template #label> Limit </template>
                <template #description> </template>
                <template #help-text></template>

                <cdx-text-input
                    id="cbm-search-limit"
                    v-model.number="searchLimit"
                    type="number"
                    min="1"
                    max="10000"
                    placeholder="Limit default: max" />
            </cdx-field>
        </div>
        <div class="cbm-search-btn">
            <div class="cbm-search-btn-wrap">
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
             * Handle category input for autocomplete.
             */
            async onCategoryInput(value) {
                if (!value || value.length < 1) {
                    this.categoryMenuItems = [];
                    return;
                }

                try {
                    const categories = await this.api.fetchCategories(value, { limit: 10 });
                    this.categoryMenuItems = categories;
                } catch (error) {
                    this.categoryMenuItems = [];
                }
            },

            /**
             * Initiate a file search.
             * Registers callbacks on the handler then delegates the work.
             */
            async searchFiles() {
                const hasCategory = this.selectedCategory || this.sourceCategory?.trim();
                if (!hasCategory && !this.searchPattern?.trim()) {
                    this.$emit('show-warning-message', 'Please enter a source category or search pattern.');
                    return;
                }

                // Wire up handler callbacks before starting
                this.searchHandler.onProgress = (text, percent) => {
                    this.searchProgressText = text;
                    this.searchProgressPercent = percent;
                    this.$emit('update:search-progress-text', text);
                    this.$emit('update:search-progress-percent', percent);
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
                if (!this.searchPattern) {
                    this.$emit('update:source-category', this.selectedCategory || this.sourceCategory);
                }
                this.$emit('update:search-progress-text', '');
                this.$emit('update:search-progress-percent', 0);

                // Clear all files and messages from previous search
                this.workFiles = [];
                this.$emit('update:work-files', this.workFiles);

                await this.searchHandler.startSearch(
                    this.selectedCategory || this.sourceCategory,
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
                this.$emit('update:search-progress-text', '');
                this.$emit('update:search-progress-percent', 0);
            },
        },
    };
}

export default SearchPanel;
