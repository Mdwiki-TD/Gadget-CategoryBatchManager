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
                default: () => ({
                    total: 0,
                    successful: 0,
                    skipped: 0,
                    failed: 0
                })
            }
        },

        data() {
            return {
                filter: 'all' // 'all', 'success', 'skipped', 'failed'
            };
        },

        computed: {
            filteredResults() {
                if (this.filter === 'all') {
                    return this.fileResults;
                }
                return this.fileResults.filter(r => r.status === this.filter);
            },

            hasResults() {
                return this.fileResults.length > 0;
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
                    <table class="cbm-reports-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>File</th>
                                <th>Status</th>
                                <th>Message</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(result, index) in filteredResults" :key="result.file + index"
                                :class="'cbm-status-' + result.status">
                                <td>{{ index + 1 }}</td>
                                <td class="cbm-file-name">{{ result.file }}</td>
                                <td>
                                    <span :class="['cbm-status-badge', 'cbm-badge-' + result.status]">
                                        {{ getStatusLabel(result.status) }}
                                    </span>
                                </td>
                                <td>{{ result.message }}</td>
                            </tr>
                        </tbody>
                    </table>
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
