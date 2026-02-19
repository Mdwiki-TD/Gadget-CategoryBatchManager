/**
 * ONLY FOR DEVELOPMENT PURPOSES. NOT FOR PRODUCTION USE.
 */

import { createApp } from "vue";
import '../localsrc/index_css.css'
import '../localsrc/darkmode.js'
import './ui/styles/main.css'
import './ui/styles/BatchManager.css'
import './ui/styles/PreviewDialog.css'
import './ui/styles/SearchPanel.css'
import './ui/styles/FilesListPanel.css'
import './ui/styles/ReportsPanel.css'
import './ui/styles/ProgressBar.css'
import './ui/styles/CategoryLookup.css'
import '@wikimedia/codex/dist/codex.style.css'

import {
    CdxButton,
    CdxTabs,
    CdxTab,
    CdxDialog,
    CdxTextInput,
    CdxTextArea,
    CdxSelect,
    CdxCheckbox,
    CdxProgressBar,
    CdxMessage,
    CdxLabel,
    CdxMultiselectLookup,
    CdxTable,
    CdxLookup,
} from "@wikimedia/codex";
import BatchManager from "./BatchManager";

// Instantiate BatchManager component (pass null for standalone mode)
// add icon to open the dialog
let icon = null;
// if user add ?icon to the URL, show the icon to open the dialog
if (new URLSearchParams(window.location.search).has('icon')) {
    icon = document.createElement('div');
    icon.style.position = 'fixed';
    icon.style.bottom = '20px';
    icon.style.right = '20px';
    icon.style.backgroundColor = '#0078d4';
    icon.style.color = '#fff';
    icon.style.padding = '10px 15px';
    icon.style.borderRadius = '5px';
    icon.style.cursor = 'pointer';
    icon.textContent = 'Open Batch Manager';
    document.body.appendChild(icon);
}

const BatchManagerComponent = BatchManager();

const App = {
    name: "App",
    components: {
        BatchManagerComponent,
    },
    template: `
        <div class="cbm-container cbm-container2">
            <h2 class="cbm-title">Category Batch Manager</h2>
            <BatchManagerComponent />
        </div>
    `,
    setup() {
        return {
        };
    },
};

createApp(App)
    .component('cdx-text-input', CdxTextInput)
    .component('cdx-textarea', CdxTextArea)
    .component('cdx-select', CdxSelect)
    .component('cdx-checkbox', CdxCheckbox)
    .component('cdx-button', CdxButton)
    .component('cdx-tabs', CdxTabs)
    .component('cdx-tab', CdxTab)
    .component('cdx-progress-bar', CdxProgressBar)
    .component('cdx-message', CdxMessage)
    .component('cdx-dialog', CdxDialog)
    .component('cdx-label', CdxLabel)
    .component('cdx-multiselect-lookup', CdxMultiselectLookup)
    .component('cdx-table', CdxTable)
    .component('cdx-lookup', CdxLookup)
    .mount('#app')
