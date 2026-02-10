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

async function createDialogWithContent(Vue, portletLink, Codex, mountPoint) {
    const batchManagerApp = BatchManager();

    // Wrap the batch manager in a dialog
    const dialogApp = {
        data: function () {
            return {
                showDialog: false,
                ...batchManagerApp.data()
            };
        },
        template: `
            <cdx-dialog
                v-model:open="showDialog"
                title="Category Batch Manager"
                :use-close-button="true"
                close-button-label="Close"
            >
                ${batchManagerApp.template}
            </cdx-dialog>
        `,
        methods: {
            ...batchManagerApp.methods,
            openDialog() {
                this.showDialog = true;
            }
        },
        mounted() {
            portletLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.openDialog();
            });
            if (batchManagerApp.mounted) {
                batchManagerApp.mounted.call(this);
            }
        },
        unmounted() {
            portletLink.removeEventListener('click', this.openDialog);
            if (batchManagerApp.unmounted) {
                batchManagerApp.unmounted.call(this);
            }
        }
    };

    Vue.createMwApp(dialogApp)
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
        .mount(mountPoint);
}

async function initApp(require) {
    const target = document.getElementById('category-batch-manager2');
    const Vue = require('vue');
    const Codex = require('@wikimedia/codex');

    if (target) {
        // In special pages - mount directly without dialog
        await createVueBatchManager(Vue, Codex);
    } else {
        // In category pages - mount with dialog overlay
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

        // Create mount point
        const mountPoint = document.createElement('div');
        mountPoint.id = 'category-batch-manager2';
        document.body.appendChild(mountPoint);

        // Create single app with dialog wrapper
        await createDialogWithContent(Vue, portletLink, Codex, mountPoint);
    }
}

mw.loader.using(['@wikimedia/codex', 'mediawiki.api', 'vue']).then(
    initApp
);
