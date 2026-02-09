// <nowiki>

if (typeof categoryBatchManager === 'undefined') {
    var categoryBatchManager = {};
}

function newFunction(require, target_id) {
    const Vue = require('vue');
    const Codex = require('@wikimedia/codex');

    const app = BatchManager();

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
        .mount(target_id);
}

mw.loader.using(['@wikimedia/codex', 'mediawiki.api', 'vue']).then(function (require) {
    const target = document.getElementById('category-batch-manager2');
    if (target) {
        categoryBatchManager.api = new mw.Api();
        newFunction(require, '#category-batch-manager2');
    } else {
        // Check if we're on a category page
        var isCategoryPage = mw.config.get('wgCanonicalNamespace') === 'Category';
        if (!isCategoryPage) return;

        // Add button to page
        var portletLink = mw.util.addPortletLink(
            'p-cactions',
            '#',
            'Batch Manager',
            'ca-batch-manager',
            'Open Category Batch Manager'
        );
        const mountPoint = document.body.appendChild(document.createElement('div'));
        mountPoint.id = 'category-batch-manager2';
        mountPoint.style.display = 'none';
        categoryBatchManager.api = new mw.Api();
        newFunction(require, '#category-batch-manager2');
        portletLink.addEventListener('click', function (e) {
            e.preventDefault();
            mountPoint.style.display = 'block';
        });

    }
});

// </nowiki>
