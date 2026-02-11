// <nowiki>

import BatchManager from './BatchManager.js';

async function initApp(require) {
    const target = document.getElementById('category-batch-manager2');
    const Vue = require('vue');
    const Codex = require('@wikimedia/codex');
    let portletLink = null;

    if (!target) {
        // In category pages - mount with overlay
        let isCategoryPage = mw.config.get('wgCanonicalNamespace') === 'Category';
        if (!isCategoryPage) return;

        // Create overlay structure
        // const overlay = createOverlay();

        // Add button to trigger overlay
        portletLink = mw.util.addPortletLink(
            'p-cactions',
            '#',
            'Batch Manager',
            'ca-batch-manager',
            'Open Category Batch Manager'
        );

        // Create mount point for Vue app
        const mountPoint = document.createElement('div');
        mountPoint.id = 'category-batch-manager2';
        document.body.appendChild(mountPoint);
    }

    // Mount Vue app inside overlay
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

mw.loader.using(['@wikimedia/codex', 'mediawiki.api', 'vue']).then(
    initApp
);
