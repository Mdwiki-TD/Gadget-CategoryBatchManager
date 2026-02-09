// <nowiki>

if (typeof categoryBatchManager === 'undefined') {
    var categoryBatchManager = {};
}

mw.loader.using(['@wikimedia/codex', 'mediawiki.api', 'vue']).then(function (require) {
    const target = document.getElementById('category-batch-manager2');
    if (!target) {
        return;
    }
    categoryBatchManager.api = new mw.Api();
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
        .mount('#category-batch-manager2');
});

// </nowiki>
