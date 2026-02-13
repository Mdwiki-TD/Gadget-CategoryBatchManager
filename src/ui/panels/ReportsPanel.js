import { DEFAULT_EXECUTION_SUMMARY } from '../../utils/Constants.js';

/**
 * Reports Panel Vue component
 * Displays detailed results of batch operations in a table
 * @returns {Object} Vue component configuration
 */
function ReportsPanel() {
    return {
        name: "ReportsPanel",
        props: {
            fileResults: {
                type: Array,
                default: () => []
            },
            summary: {
                type: Object,
                default: () => ({ ...DEFAULT_EXECUTION_SUMMARY })
            }
        },

        data() {
            return {
                filter: 'all' // 'all', 'success', 'skipped', 'failed'
            };
        },

        computed: {
            filteredResults: function() {
                if (this.filter === 'all') {
                    return this.fileResults;
                }
                return this.fileResults.filter(function(r) { return r.status === this.filter; }.bind(this));
            },

            hasResults: function() {
                return this.fileResults.length > 0;
            },

            tableData: function() {
                const self = this;
                return this.filteredResults.map(function(r, index) {
                    return {
                        index: index + 1,
                        file: r.file,
                        status: r.status,
                        statusLabel: self.getStatusLabel(r.status),
                        message: r.message
                    };
                });
            },

            tableColumns: function() {
                return [
                    { id: 'index', label: '#', width: '50px' },
                    { id: 'file', label: 'File' },
                    { id: 'status', label: 'Status', width: '120px' },
                    { id: 'message', label: 'Message' }
                ];
            }
        },

        template: `
            <div class="cbm-reports-panel">
                <!-- Summary Cards -->
                <div v-if="hasResults" class="cbm-reports-summary">
                    <div class="cbm-summary-card cbm-summary-total">
                        <span class="cbm-summary-number">{{ summary.total }}</span>
                        <span class="cbm-summary-label">Total</span>
                    </div>
                    <div class="cbm-summary-card cbm-summary-success">
                        <span class="cbm-summary-number">{{ summary.successful }}</span>
                        <span class="cbm-summary-label">Successful</span>
                    </div>
                    <div class="cbm-summary-card cbm-summary-skipped">
                        <span class="cbm-summary-number">{{ summary.skipped }}</span>
                        <span class="cbm-summary-label">No Change</span>
                    </div>
                    <div class="cbm-summary-card cbm-summary-failed">
                        <span class="cbm-summary-number">{{ summary.failed }}</span>
                        <span class="cbm-summary-label">Failed</span>
                    </div>
                </div>

                <!-- Filter Buttons -->
                <div v-if="hasResults" class="cbm-reports-filters">
                    <cdx-button
                        :class="['cbm-filter-btn', { active: filter === 'all' }]"
                        @click="filter = 'all'"
                        weight="quiet">
                        All ({{ fileResults.length }})
                    </cdx-button>
                    <cdx-button
                        :class="['cbm-filter-btn', { active: filter === 'success' }]"
                        @click="filter = 'success'"
                        weight="quiet">
                        Successful ({{ summary.successful }})
                    </cdx-button>
                    <cdx-button
                        :class="['cbm-filter-btn', { active: filter === 'skipped' }]"
                        @click="filter = 'skipped'"
                        weight="quiet">
                        No Change ({{ summary.skipped }})
                    </cdx-button>
                    <cdx-button
                        :class="['cbm-filter-btn', { active: filter === 'failed' }]"
                        @click="filter = 'failed'"
                        weight="quiet">
                        Failed ({{ summary.failed }})
                    </cdx-button>
                </div>

                <!-- Results Table -->
                <div v-if="hasResults" class="cbm-reports-table-container">
                    <cdx-table
                        :data="tableData"
                        :columns="tableColumns"
                        :use-row-headers="false"
                        class="cbm-reports-table"
                    >
                        <template #cell-status="{ row }">
                            <span :class="['cbm-status-badge', 'cbm-badge-' + row.status]">
                                {{ row.statusLabel }}
                            </span>
                        </template>
                    </cdx-table>
                </div>

                <!-- Empty State -->
                <div v-else class="cbm-reports-empty">
                    <p>No reports available yet.</p>
                    <p class="cbm-reports-hint">Run a batch operation to see detailed results here.</p>
                </div>
            </div>
        `,

        methods: {
            getStatusLabel(status) {
                const labels = {
                    success: 'Success',
                    skipped: 'No Change',
                    failed: 'Failed'
                };
                return labels[status] || status;
            }
        }
    };
}

export default ReportsPanel;
