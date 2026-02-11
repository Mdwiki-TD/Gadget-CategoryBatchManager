
import { PreviewHandler } from "../handlers";
import { ChangesHelper } from "../helpers";

/**
 * PreviewPanel
 * @param {PreviewHandler} preview_handler - PreviewHandler instance
 * @param {ChangesHelper} changes_helpers - ChangesHelper instance for validation and preparation
 * @returns {Object} Vue app configuration
 */

function PreviewPanel(preview_handler, changes_helpers) {
    const app = {
        data: function () {
            return {
                previewRows: [],
                changesCount: '',
                openPreviewHandler: false,
            };
        },
        template: `
            <cdx-button @click="handlePreview" action="default" weight="normal"
                :disabled="isProcessing">
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
                    showWarningMessage: (msg) => {
                        this.showWarningMessage(msg);
                    },
                    displayCategoryMessage: (msg, notice_type, msg_type) => {
                        this.displayCategoryMessage(msg, notice_type, msg_type);
                    }
                };
                const preparation = changes_helpers.validateAndPrepare(
                    this.sourceCategory,
                    this.selectedFiles,
                    this.addCategory.selected,
                    this.removeCategory.selected,
                    callbacks
                );
                if (!preparation) {
                    console.error('[CBM-P] Preview preparation failed');
                    return;
                }
                // TODO: Cannot read properties of undefined (reading 'length') preparation.filesToProcess.length
                console.log('[CBM-P] Preview result:', preparation.filesToProcess.length, 'items');

                this.previewRows = preview_handler.filterFilesToProcess(preparation.filesToProcess);

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
