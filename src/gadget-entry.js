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

function createOverlay() {
    // Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'batch-manager-overlay';
    overlay.style.cssText = `
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 1000;
        overflow: auto;
    `;

    // Create dialog container
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        position: relative;
        background: white;
        margin: 50px auto;
        max-width: 90%;
        width: 1200px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        padding: 20px;
    `;

    // Create close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        font-size: 28px;
        cursor: pointer;
        color: #666;
        line-height: 1;
        padding: 0;
        width: 30px;
        height: 30px;
    `;
    closeButton.setAttribute('aria-label', 'Close');
    closeButton.onclick = () => {
        overlay.style.display = 'none';
    };

    // Create mount point for Vue app
    const mountPoint = document.createElement('div');
    mountPoint.id = 'category-batch-manager2';

    // Assemble structure
    dialog.appendChild(closeButton);
    dialog.appendChild(mountPoint);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Close on overlay background click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.style.display = 'none';
        }
    });

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.style.display === 'block') {
            overlay.style.display = 'none';
        }
    });

    return overlay;
}

async function initApp(require) {
    const target = document.getElementById('category-batch-manager2');
    const Vue = require('vue');
    const Codex = require('@wikimedia/codex');

    if (target) {
        // In special pages - mount directly without overlay
        await createVueBatchManager(Vue, Codex);
    } else {
        // In category pages - mount with overlay
        let isCategoryPage = mw.config.get('wgCanonicalNamespace') === 'Category';
        if (!isCategoryPage) return;

        // Create overlay structure
        const overlay = createOverlay();

        // Add button to trigger overlay
        let portletLink = mw.util.addPortletLink(
            'p-cactions',
            '#',
            'Batch Manager',
            'ca-batch-manager',
            'Open Category Batch Manager'
        );

        portletLink.addEventListener('click', (e) => {
            e.preventDefault();
            overlay.style.display = 'block';
        });

        // Mount Vue app inside overlay
        await createVueBatchManager(Vue, Codex);
    }
}

mw.loader.using(['@wikimedia/codex', 'mediawiki.api', 'vue']).then(
    initApp
);
