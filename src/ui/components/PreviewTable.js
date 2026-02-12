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
                caption="Files to be updated"
                :columns="columns"
                :data="sortedData"
                @update:sort="onSort"
            >
                <template #item-currentCategories="{ item }">
                    <div v-for="(cat, index) in item" :key="index" class="cbm-category-item">
                        {{ cat }}
                    </div>
                </template>

                <template #item-newCategories="{ item }">
                    <div v-for="(cat, index) in item" :key="index" class="cbm-category-item">
                        {{ cat }}
                    </div>
                </template>

                <template #item-diff="{ item }">
                    <span :class="getDiffClass(item)">
                        {{ formatDiff(item) }}
                    </span>
                </template>
            </cdx-table>
        `,
        computed: {
            columns() {
                return [
                    { id: 'file', label: 'File', allowSort: true },
                    { id: 'currentCategories', label: 'Current categories' },
                    { id: 'newCategories', label: 'New categories' },
                    { id: 'diff', label: 'Δ', allowSort: true, textAlign: 'number' }
                ];
            },
            tableData() {
                return this.rows.map(row => ({
                    file: row.file,
                    currentCategories: row.currentCategories || [],
                    newCategories: row.newCategories || [],
                    diff: row.diff || 0
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
                    } else if (sortKey === 'diff') {
                        comparison = a.diff - b.diff;
                    }

                    return sortOrder === 'asc' ? comparison : -comparison;
                });

                return sorted;
            }
        },
        methods: {
            onSort(newSort) {
                this.sort = newSort;
            },
            getDiffClass(diff) {
                if (diff > 0) return 'cbm-diff-positive';
                if (diff < 0) return 'cbm-diff-negative';
                return 'cbm-diff-zero';
            },
            formatDiff(diff) {
                if (diff > 0) return `+${diff}`;
                return (diff || 0).toString();
            }
        }
    };
}

export default PreviewTable;
