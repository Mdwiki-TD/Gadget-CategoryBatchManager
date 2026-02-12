/**
 * Tabs component wrapper for Wikimedia Codex CdxTabs
 * Container for Tab components - handles active tab state and navigation
 * @returns {Object} Vue component configuration
 */

function Tabs() {
    return {
        name: "Tabs",
        props: {
            /** The name of the currently active tab (for v-model:active binding) */
            active: { type: String, default: null },
            /** Whether to display tabs in framed visual style */
            framed: { type: Boolean, default: false },
        },

        template: `
            <cdx-tabs
                :active="active"
                :framed="framed"
                @update:active="onUpdateActive">
                <slot></slot>
            </cdx-tabs>
        `,

        methods: {
            onUpdateActive(tabName) {
                this.$emit('update:active', tabName);
            },
        },
    };
}

export default Tabs;
