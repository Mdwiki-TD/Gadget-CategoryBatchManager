/**
 * Wrapper components for BatchManager
 * Provides both Dialog and Standalone versions
 */

import BatchManager from './BatchManager.js';

/**
 * Dialog wrapper for BatchManager
 * Handles showMainDialog state and wraps BatchManager in a CdxDialog
 * @param {HTMLElement} portletLink - The portlet link element that triggers the dialog
 * @returns {Object} Vue app definition
 */

function BatchManagerDialog(portletLink) {

    const template = portletLink
        ? `<cdx-dialog
               v-model:open="showMainDialog"
               class="cbm-container"
               title="Category Batch Manager"
               :use-close-button="true"
               close-button-label="Close"
               @default="showMainDialog = false">
               <cdx-tabs v-model:active="activeTab" :framed="true">
                   <cdx-tab name="manager" label="Batch Manager">
                       <BatchManager />
                   </cdx-tab>
                   <cdx-tab name="reports" label="Reports">
                       <div class="cbm-reports-placeholder">
                           <p>Reports will be available here soon.</p>
                       </div>
                   </cdx-tab>
               </cdx-tabs>
           </cdx-dialog>`
        : `<div class="cbm-container cbm-container2">
               <h2 class="cbm-title">Category Batch Manager</h2>
               <cdx-tabs v-model:active="activeTab" :framed="true">
                   <cdx-tab name="manager" label="Batch Manager">
                       <BatchManager />
                   </cdx-tab>
                   <cdx-tab name="reports" label="Reports">
                       <div class="cbm-reports-placeholder">
                           <p>Reports will be available here soon.</p>
                       </div>
                   </cdx-tab>
               </cdx-tabs>
           </div>
        `;
    const app = {
        name: "BatchManagerDialog",
        data() {
            return {
                showMainDialog: false,
                activeTab: 'manager',
            };
        },
        methods: {
            openMainDialog() {
                this.showMainDialog = true;
            },
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
        },
    };

    return app;
}

export { BatchManagerDialog };

export default BatchManagerDialog;
