/**
 * PreviewPanel
 * @param {ChangesHelper} changes_helpers - ChangesHelper instance for validation and preparation
 * @returns {Object} Vue app configuration
 */

import { ChangesHelper } from "../helpers";

function PreviewPanel(changes_helpers) {
    return {
        data() {
            return {
                previewRows: [],
                changesCount: 0,
                openPreviewDialog: false,
            };
        },

        template: `
            <cdx-button
                action="default"
                weight="normal"
                :disabled="isProcessing"
                @click="handlePreview">
                Preview Changes
            </cdx-button>
            <cdx-dialog
                v-model:open="openPreviewDialog"
                class="cbm-preview-dialog"
                title="Preview Changes"
                :use-close-button="true"
                @default="openPreviewDialog = false"
            >
                <p v-if="changesCount > 0">
                    {{ changesCount }} file(s) will be updated.
                </p>
                <p v-else>
                    No changes detected. Adjust categories and preview again.
                </p>
                <table class="cbm-preview-table">
                    <thead>
                        <tr>
                            <th>File</th>
                            <th>Current categories</th>
                            <th>New categories</th>
                            <th>Δ</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="previewRows.length > 0" v-for="(row, index) in previewRows" :key="index">
                            <td>{{ row.file }}</td>
                            <td>
                                <div v-for="(cat, j) in row.currentCategories" :key="j">{{ cat }}</div>
                            </td>
                            <td>
                                <div v-for="(cat, j) in row.newCategories" :key="j">
                                    {{ cat }}
                                </div>
                            </td>
                            <td>
                                {{ row.diff }}
                            </td>
                        </tr>
                    </tbody>
                </table>
                <template #footer-text>
                </template>
            </cdx-dialog>
        `,
        methods: {
            handlePreview: function () {
                console.log('[CBM-P] Preview button clicked');
                const callbacks = {
                    onError: (msg) => {
                        this.displayCategoryMessage(msg, 'error', 'add');
                    },
                    onWarning: (msg) => {
                        this.displayCategoryMessage(msg, 'warning', 'add');
                    }
                };

                const prep = changes_helpers.validateAndReturnPreparation(
                    this.sourceCategory,
                    this.selectedFiles,
                    this.addCategory.selected,
                    this.removeCategory.selected,
                    callbacks
                );
                if (!prep) {
                    console.error('[CBM] preparation failed');
                    return;
                }
                console.log('[CBM-P] Preview result:', prep.filesToProcess.length, 'items');

                // Add diff calculation for display
                this.previewRows = prep.filesToProcess.map(row => ({
                    ...row,
                    diff: row.newCategories.length - row.currentCategories.length,
                }));

                this.changesCount = prep.filesToProcess.length;

                if (!this.changesCount) {
                    console.log('[CBM] No changes detected');
                    this.displayCategoryMessage('ℹ️ No changes detected.', 'notice', 'add');
                }
                console.log('[CBM-P] Opening preview dialog');
                this.openPreviewDialog = true;
            },
        },
    };
}

export default PreviewPanel;
