/**
 * PreviewTable Component
 * Uses Codex CdxTable to display preview changes
 * @returns {Object} Vue component definition
 */

function PreviewTable() {
    return {
        name: 'PreviewTable',
        props: {
            rows: {
                type: Array,
                required: true,
                default: () => []
            }
        },
        data() {
            return {
                sort: { file: 'asc' }
            };
        },
        template: `
            <cdx-table
                v-model:sort="sort"
                class="cdx-docs-table-with-sort cbm-preview-table"
                caption="Preview of changes"
                :hideCaption="true"
                :columns="columns"
                :showVerticalBorders="true"
                :data="sortedData"
                @update:sort="onSort"
            >
                <template #item-file="{ item }">
                    <a
                        :href="'https://commons.wikimedia.org/wiki/' + encodeURIComponent(item)"
                        target="_blank"
                        class="cbm-file-link"
                    >{{ item }}</a>
                </template>

                <template #item-wouldAdd="{ item }">
                    <div v-if="item.length > 0" class="cbm-category-list cbm-add">
                        <span v-for="(cat, index) in item" :key="index" class="cbm-category-tag cbm-tag-add">
                            + {{ cat }}
                        </span>
                    </div>
                    <span v-else class="cbm-empty-cell">-</span>
                </template>

                <template #item-wouldRemove="{ item }">
                    <div v-if="item.length > 0" class="cbm-category-list cbm-remove">
                        <span v-for="(cat, index) in item" :key="index" class="cbm-category-tag cbm-tag-remove">
                            - {{ cat }}
                        </span>
                    </div>
                    <span v-else class="cbm-empty-cell">-</span>
                </template>
            </cdx-table>
        `,
        computed: {
            columns() {
                return [
                    { id: 'file', label: 'File', allowSort: true },
                    { id: 'wouldAdd', label: 'Will Add' },
                    { id: 'wouldRemove', label: 'Will Remove' }
                ];
            },
            tableData() {
                return this.rows.map(row => ({
                    file: row.file,
                    wouldAdd: row.wouldAdd || [],
                    wouldRemove: row.wouldRemove || []
                }));
            },
            sortedData() {
                const sortKey = Object.keys(this.sort)[0];
                const sortOrder = this.sort[sortKey];

                if (sortOrder === 'none') {
                    return this.tableData;
                }

                // Use local variable with JSDoc to fix TS error about tableData being a function
                /** @type {any[]} */
                const data = (/** @type {any} */ (this)).tableData;
                const sorted = [...data].sort((a, b) => {
                    let comparison = 0;

                    if (sortKey === 'file') {
                        comparison = a.file.localeCompare(b.file);
                    }

                    return sortOrder === 'asc' ? comparison : -comparison;
                });

                return sorted;
            }
        },
        methods: {
            onSort(newSort) {
                this.sort = newSort;
            }
        }
    };
}

export default PreviewTable;
