/**
 * ONLY FOR DEVELOPMENT PURPOSES. NOT FOR PRODUCTION USE.
 */

import { createApp } from "vue";
import './ui/styles/main.css'
import './ui/styles/PreviewDialog.css'
import '@wikimedia/codex/dist/codex.style.css'
import BatchManagerFactory from "./BatchManager.js";

import {
    CdxButton,
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
} from "@wikimedia/codex";

// Instantiate BatchManager component (pass null for standalone mode)
const BatchManager = BatchManagerFactory(null);

const App = {
    name: "App",
    components: {
        BatchManager,
    },
    template: `
        <BatchManager />
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
    .component('cdx-progress-bar', CdxProgressBar)
    .component('cdx-message', CdxMessage)
    .component('cdx-dialog', CdxDialog)
    .component('cdx-label', CdxLabel)
    .component('cdx-multiselect-lookup', CdxMultiselectLookup)
    .component('cdx-table', CdxTable)
    .mount('#app')
