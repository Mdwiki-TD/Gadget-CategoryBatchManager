// <nowiki>

import BatchManager from './BatchManager.js';
import mw from './services/mw.js';

async function initApp(require) {
    const Vue = require('vue');
    const Codex = require('@wikimedia/codex');

    let portletLink = null;
    let mountPoint = document.getElementById('category-batch-manager2');

    if (!mountPoint) {
        if (mw.config.get('wgCanonicalNamespace') !== 'Category') return;

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

    const app = BatchManager(portletLink);

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
        .mount('#category-batch-manager2');
}

mw.loader.using(['@wikimedia/codex', 'mediawiki.api', 'vue']).then(initApp);
