// <nowiki>

function createVueBatchManager(Vue, Codex) {
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
}
async function createDialogApp(Vue, portletLink, Codex, mountPoint) {
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
}

async function initApp(require) {
    const target = document.getElementById('category-batch-manager2');
    const Vue = require('vue');
    const Codex = require('@wikimedia/codex');

    if (target) {
        // no overlay here
        // If the mount point already exists, just mount the app
        // this case in special pages where the mount point is pre-defined in the HTML, no icon need to add trigger
        await createVueBatchManager(Vue, Codex);
    } else {
        // overlay needed here
        // in category pages, we need to add the button to trigger the dialog
        // Check if we're on a category page
        var isCategoryPage = mw.config.get('wgCanonicalNamespace') === 'Category';
        if (!isCategoryPage) return;

        // Add button to trigger dialog
        var portletLink = mw.util.addPortletLink(
            'p-cactions',
            '#',
            'Batch Manager',
            'ca-batch-manager',
            'Open Category Batch Manager'
        );

        const mountPoint = document.createElement('div');
        mountPoint.id = 'category-batch-manager2';
        document.body.appendChild(mountPoint);

        await createDialogApp(Vue, portletLink, Codex, mountPoint);

        await createVueBatchManager(Vue, Codex);
    }
}

mw.loader.using(['@wikimedia/codex', 'mediawiki.api', 'vue']).then(
    initApp
);

