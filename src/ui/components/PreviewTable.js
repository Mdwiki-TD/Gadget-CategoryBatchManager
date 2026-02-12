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
        template: `
            <cdx-table
                class="cbm-preview-table"
                caption="Files to be updated"
                :columns="columns"
                :data="tableData"
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
                    { id: 'file', label: 'File' },
                    { id: 'currentCategories', label: 'Current categories' },
                    { id: 'newCategories', label: 'New categories' },
                    { id: 'diff', label: 'Δ', textAlign: 'number' }
                ];
            },
            tableData() {
                return this.rows.map(row => ({
                    file: row.file,
                    currentCategories: row.currentCategories,
                    newCategories: row.newCategories,
                    diff: row.diff
                }));
            }
        },
        methods: {
            getDiffClass(diff) {
                if (diff > 0) return 'cbm-diff-positive';
                if (diff < 0) return 'cbm-diff-negative';
                return 'cbm-diff-zero';
            },
            formatDiff(diff) {
                if (diff > 0) return `+${diff}`;
                return diff.toString();
            }
        }
    };
}

export default PreviewTable;
