/**
 * Multiselect-lookup wrapper for category autocomplete fields.
 * Emits no events of its own — all logic is delegated to the injected handler.
 * @returns {Object} Vue component configuration
 */

function CategoryLookup() {
    return {
        name: "CategoryLookup",
        props: {
            /** Reactive data object (chips, selected, input, menuItems, menuConfig, message) */
            model: { type: Object, required: true },
            label: { type: String, required: true },
            ariaLabel: { type: String, required: true },
            placeholder: { type: String, default: 'Type to search categories' },
            /** 'add' | 'remove' — passed through to the handler */
            type: { type: String, required: true },
            /** CategoryInputsHandler instance */
            handler: { type: Object, required: true },
        },

        template: `
            <div class="cbm-category-lookup">
                <!-- Input Group -->
                <div class="cbm-category-input-group">
                    <cdx-label class="cbm-label">
                        {{ label }}
                    </cdx-label>

                    <cdx-multiselect-lookup
                        v-model:input-chips="model.chips"
                        v-model:selected="model.selected"
                        v-model:input-value="model.input"
                        :menu-items="model.menuItems"
                        :menu-config="model.menuConfig"
                        :aria-label="ariaLabel"
                        :placeholder="placeholder"
                        @update:input-value="onInput"
                        @load-more="onLoadMore">
                        <template #no-results>
                            No results found
                        </template>
                    </cdx-multiselect-lookup>
                </div>

                <!-- Message -->
                <div
                    v-if="model.message?.show"
                    class="margin-bottom-20">
                    <cdx-message
                        :key="model.message.key"
                        allow-user-dismiss
                        :type="model.message.type"
                        :inline="false"
                        @dismiss="hideMessage">
                        {{ model.message.text }}
                    </cdx-message>
                </div>
            </div>
        `,

        methods: {
            async onInput(value) {
                this.hideMessage();

                const data = await this.handler.onCategoryInput(
                    value,
                    this.model.input,
                    this.type
                );

                if (data !== null) {
                    this.model.menuItems = data;
                }
            },

            async onLoadMore() {
                const results = await this.handler.onLoadMore(
                    this.model,
                    this.type
                );

                if (results && results.length > 0) {
                    this.model.menuItems.push(...results);
                }
            },

            hideMessage() {
                if (this.model.message) {
                    this.model.message.show = false;
                    this.model.message.text = "";
                }
            },
        },
    }
}

export default CategoryLookup;
