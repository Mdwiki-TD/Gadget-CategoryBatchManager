// <nowiki>

function newFunction(Vue, Codex, target_id) {
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
    const Vue = require('vue');
    const Codex = require('@wikimedia/codex');

    if (target) {
        newFunction(Vue, Codex, '#category-batch-manager2');
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

        Vue.createMwApp({
            data: function () {
                return {
                    showDialog: false,
                };
            },
            template: `
                <cdx-dialog
                    v-model:open="showDialog"
                    title=""
                    :use-close-button="true"
                    class="cdx-demo-onboarding-dialog"
                    close-button-label="Close"
                    @default="open = false"
                >
                    <div id="category-batch-manager2"></div>
                </cdx-dialog>
            `,
            methods: {
                openDialog() {
                    this.showDialog = true;
                }
            },
            mounted() {
                portletLink.addEventListener('click', this.openDialog);
            },
            unMounted() {
                portletLink.removeEventListener(this.openDialog);
            }
        })
            .component('cdx-button', Codex.CdxButton)
            .component('cdx-dialog', Codex.CdxDialog)
            .mount(mountPoint);

        newFunction(Vue, Codex, '#category-batch-manager2');
    }
});

// </nowiki>
