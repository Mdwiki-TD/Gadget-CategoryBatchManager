/**
 * PreviewPanel
 * @returns {Object} Vue app configuration
 */

import PreviewTable from "../components/PreviewTable.js";

function PreviewPanel() {
    return {
        props: {
            isProcessing: {
                type: Boolean,
                default: false
            },
            sourceCategory: {
                type: String,
                default: ''
            },
            selectedFiles: {
                type: Array,
                default: () => []
            },
            addCategorySelected: {
                type: Array,
                default: () => []
            },
            removeCategorySelected: {
                type: Array,
                default: () => []
            },
            changesHelpers: {
                type: Object,
                required: true
            }
        },
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

                <PreviewTable :rows="previewRows" />

                <template #footer-text>
                </template>
            </cdx-dialog>
        `,

        components: {
            PreviewTable: PreviewTable(),
        },
        methods: {
            handlePreview: function () {
                console.log('[CBM-P] Preview button clicked');
                const callbacks = {
                    onError: (msg) => {
                        this.$emit('display-message', msg, 'error', 'add');
                    },
                    onWarning: (msg) => {
                        this.$emit('display-message', msg, 'warning', 'add');
                    }
                };

                const prep = this.changesHelpers.validateAndReturnPreparation(
                    this.sourceCategory,
                    this.selectedFiles,
                    this.addCategorySelected,
                    this.removeCategorySelected,
                    callbacks
                );
                if (!prep) {
                    console.error('[CBM] preparation failed');
                    return;
                }
                console.log('[CBM-P] Preview result:', prep.filesToProcess.length, 'items');

                this.previewRows = prep.filesToProcess;
                this.changesCount = prep.filesToProcess.length;

                if (!this.changesCount) {
                    console.log('[CBM] No changes detected');
                    this.$emit('display-message', 'ℹ️ No changes detected.', 'notice', 'add');
                }
                console.log('[CBM-P] Opening preview dialog');
                this.openPreviewDialog = true;
            },
        },
    };
}

export default PreviewPanel;
