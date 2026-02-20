// <nowiki>

import { BatchManagerDialog } from './BatchManagerWrappers.js';
import mw from './services/mw.js';

async function initApp(require) {
    const Vue = require('vue');
    const Codex = require('@wikimedia/codex');

    let portletLink = null;
    let mountPoint = document.getElementById('category-batch-manager2');

    if (!mountPoint) {
        if (mw.config.get('wgCanonicalNamespace') !== 'Category') return;

        // work only in Desktop view
        if (!document.getElementById('p-cactions') || document.getElementById('footer-places-desktop-toggle')) return;

        portletLink = mw.util.addPortletLink(
            'p-cactions',
            '#',
            'Batch Manager',
            'ca-batch-manager',
            'Open Category Batch Manager'
        );

        mountPoint = document.createElement('div');
        mountPoint.id = 'category-batch-manager2';
        document.body.appendChild(mountPoint);
    }

    const app = BatchManagerDialog(portletLink);

    // @ts-ignore
    Vue.createMwApp(app)
        .component('cdx-text-input', Codex.CdxTextInput)
        .component('cdx-textarea', Codex.CdxTextArea)
        .component('cdx-select', Codex.CdxSelect)
        .component('cdx-checkbox', Codex.CdxCheckbox)
        .component('cdx-button', Codex.CdxButton)
        .component('cdx-progress-bar', Codex.CdxProgressBar)
        .component('cdx-message', Codex.CdxMessage)
        .component('cdx-dialog', Codex.CdxDialog)
        .component('cdx-label', Codex.CdxLabel)
        .component('cdx-multiselect-lookup', Codex.CdxMultiselectLookup)
        .component('cdx-table', Codex.CdxTable)
        .component('cdx-lookup', Codex.CdxLookup)
        .component('cdx-tab', Codex.CdxTab)
        .component('cdx-tabs', Codex.CdxTabs)
        .component('cdx-field', Codex.CdxField)
        .component('cdx-toggle-switch', Codex.CdxToggleSwitch)
        .mount('#category-batch-manager2');
}

mw.loader.using(['@wikimedia/codex', 'mediawiki.api', 'vue']).then(initApp);
