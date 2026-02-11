
import { ChangeCalculator } from "../../utils";
import { ChangesHelper } from "../helpers";

/**
 * PreviewPanel
 * @param {ChangesHelper} changes_helpers - ChangesHelper instance for validation and preparation
 * @returns {Object} Vue app configuration
 */

function PreviewPanel(changes_helpers) {
    const app = {
        data: function () {
            return {
                previewRows: [],
                changesCount: '',
                openPreviewHandler: false,
            };
        },
        template: `
            <cdx-button
                @click="handlePreview"
                action="default"
                weight="normal"
                :disabled="isProcessing"
                >
                Preview Changes
            </cdx-button>
            <cdx-dialog
                v-model:open="openPreviewHandler"
                class="cbm-preview-dialog"
                title="Preview Changes"
                :use-close-button="true"
                @default="openPreviewHandler = false"
            >
                <p v-if="changesCount > 0">
                    {{ changesCount }} file(s) will be updated. Review the changes below before saving.
                </p>
                <p v-else>
                    No changes detected. Please adjust your categories to add/remove and preview again.
                </p>
                <table class="cbm-preview-table">
                    <thead>
                        <tr>
                            <th>File</th>
                            <th>Current Categories</th>
                            <th>New Categories</th>
                            <th>Diff</th>
                        </tr>
                    </thead>

                    <tbody>
                        <tr v-if="previewRows.length > 0" v-for="(row, index) in previewRows" :key="index">
                            <td>{{ row.file }}</td>

                            <td>
                                <div v-for="(cat, i) in row.currentCategories" :key="i">
                                    {{ cat }}
                                </div>
                            </td>

                            <td>
                                <div v-for="(cat, i) in row.newCategories" :key="i">
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
                const preparation = changes_helpers.validateAndReturnPreparation(
                    this.sourceCategory,
                    this.selectedFiles,
                    this.addCategory.selected,
                    this.removeCategory.selected,
                    callbacks
                );
                if (!preparation) {
                    console.error('[CBM] preparation failed');
                    return;
                }
                console.log('[CBM-P] Preview result:', preparation.filesToProcess.length, 'items');

                // filesToProcess now contains preview objects with: file, currentCategories, newCategories, willChange
                // Add diff calculation for display
                this.previewRows = preparation.filesToProcess.map(row => ({
                    ...row,
                    diff: row.newCategories.length - row.currentCategories.length
                }));

                this.changesCount = preparation.filesToProcess.length;

                if (this.changesCount === 0) {
                    console.log('[CBM] No changes detected');
                    this.displayCategoryMessage('ℹ️ No changes detected.', 'notice', 'add');
                }
                console.log('[CBM-P] Opening preview dialog');
                this.openPreviewHandler = true;
            }
        }
    };

    return app;
}

export default PreviewPanel;
