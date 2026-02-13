/**
 * Wrapper components for BatchManager
 * Provides both Dialog and Standalone versions
 */

import BatchManager from './BatchManager.js';
import ReportsPanel from './ui/panels/ReportsPanel.js';
import { DEFAULT_EXECUTION_SUMMARY } from './utils/Constants.js';

/**
 * Dialog wrapper for BatchManager
 * Handles showMainDialog state and wraps BatchManager in a CdxDialog
 * @param {HTMLElement} portletLink - The portlet link element that triggers the dialog
 * @returns {Object} Vue app definition
 */

function BatchManagerDialog(portletLink) {

    const innerTemplate = `
        <cdx-tabs v-model:active="activeTab" :framed="true">
            <cdx-tab name="manager" label="Batch Manager">
                <BatchManager @execution-complete="handleExecutionComplete" />
            </cdx-tab>
            <cdx-tab name="reports" label="Reports">
                <ReportsPanel
                    :file-results="fileResults"
                    :summary="executionSummary"
                />
            </cdx-tab>
        </cdx-tabs>
        `;
    const template = portletLink
        ? `<cdx-dialog
               v-model:open="showMainDialog"
               class="cbm-container"
               title="Category Batch Manager"
               :use-close-button="true"
               close-button-label="Close"
               @default="showMainDialog = false">
               ${innerTemplate}
           </cdx-dialog>`
        : `<div class="cbm-container cbm-container2">
               <h2 class="cbm-title">Category Batch Manager</h2>
               ${innerTemplate}
           </div>
        `;
    const app = {
        name: "BatchManagerDialog",
        data() {
            return {
                showMainDialog: false,
                activeTab: 'manager',
                fileResults: [],
                executionSummary: { ...DEFAULT_EXECUTION_SUMMARY }
            };
        },
        methods: {
            openMainDialog() {
                this.showMainDialog = true;
            },
            handleExecutionComplete(results) {
                this.fileResults = results.fileResults;
                this.executionSummary = results.summary;
            }
        },
        template: template,
        mounted() {
            if (portletLink) {
                portletLink.addEventListener('click', this.openMainDialog);
            }
        },
        unmounted() {
            if (portletLink) {
                portletLink.removeEventListener('click', this.openMainDialog);
            }
        },
        components: {
            BatchManager: BatchManager(),
            ReportsPanel: ReportsPanel()
        },
    };

    return app;
}

export { BatchManagerDialog };

export default BatchManagerDialog;
