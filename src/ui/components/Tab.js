/**
 * Tab component wrapper for Wikimedia Codex CdxTab
 * Individual tab item within Tabs container
 * @returns {Object} Vue component configuration
 */

function Tab() {
    return {
        name: "Tab",
        props: {
            /** Unique identifier for the tab (required) */
            name: { type: String, required: true },
            /** Display label for the tab header */
            label: { type: String, required: true },
        },

        template: `
            <cdx-tab
                :name="name"
                :label="label">
                <slot></slot>
            </cdx-tab>
        `,
    };
}

export default Tab;
