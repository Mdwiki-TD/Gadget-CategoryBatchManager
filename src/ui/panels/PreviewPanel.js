/**
 * PreviewPanel
 * @param {Object} preview_handler - PreviewHandler instance
 * @returns {Object} Vue app configuration
 */

function PreviewPanel(preview_handler) {
    const app = {
        data: function () {
            return {
                preview_handler: preview_handler,
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
                return this.preview_handler.handlePreview(this);
            }
        }
    };

    return app;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PreviewPanel;
}
