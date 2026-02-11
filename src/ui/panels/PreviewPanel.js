
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
            filterFilesToProcess(filesToProcess) {
                return filesToProcess.map(row => {
                    // newCategories: undefined false
                    if (!Array.isArray(row.newCategories)) {
                        console.log('newCategories:', row.newCategories);
                        console.log('row:', row); // row: Proxy(FileModel) {…}
                        // TODO: find why FileModel is used here and causes newCategories to be undefined
                    }
                    return {
                        file: row.file,
                        currentCategories: [...row.currentCategories],
                        newCategories: [...row.newCategories], // TypeError: row.newCategories is not iterable
                        diff: row.newCategories.length - row.currentCategories.length
                    };
                });
            },
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

                // Validate
                const validation = changes_helpers.validateOperation(
                    this.selectedFiles,
                    this.addCategory.selected,
                    this.removeCategory.selected,
                );

                if (!validation.valid) {
                    console.log('[CBM-P] Validation failed:', validation.error);
                    this.showWarningMessage(validation.error);
                    return;
                }

                const preparationCheck = changes_helpers.validateAndPrepare(
                    this.sourceCategory,
                    this.addCategory.selected,
                    this.removeCategory.selected,
                    callbacks
                );
                if (!preparationCheck) {
                    console.error('[CBM-P] Preview preparationCheck failed');
                    return;
                }

                // Filter files to only those that will actually change
                // This ensures the confirmation message shows the correct count
                const filesThatWillChange = ChangeCalculator.filterFilesThatWillChange(
                    this.selectedFiles,
                    preparationCheck.validAddCategories,
                    this.removeCategory.selected
                );

                const preparation = {
                    validAddCategories: preparationCheck.validAddCategories,
                    removeCategories: this.removeCategory.selected,
                    filesCount: filesThatWillChange.length,
                    filesToProcess: filesThatWillChange
                };
                console.log('[CBM-P] Preview result:', preparation.filesToProcess.length, 'items');

                this.previewRows = this.filterFilesToProcess(preparation.filesToProcess);

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
