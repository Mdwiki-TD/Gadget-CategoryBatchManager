function CategoryLookup() {
    return {
        props: {
            model: Object,
            label: String,
            ariaLabel: String,
            placeholder: String,
            type: String,
            handler: Object
        },

        template: `
            <div>
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
                        @load-more="onLoadMore"
                    >
                        <template #no-results>
                            Type at least 2 characters to search
                        </template>
                    </cdx-multiselect-lookup>
                </div>

                <div v-if="model.message.show" class="margin-bottom-20">
                    <cdx-message
                        allow-user-dismiss
                        :type="model.message.type"
                        :inline="false"
                    >
                        {{ model.message.text }}
                    </cdx-message>
                </div>
            </div>
        `,

        methods: {
            async onInput(value) {
                this.model.message.show = false;

                const data = await this.handler.onCategoryInput(
                    value,
                    this.model.input,
                    this.type
                );

                if (data) {
                    this.model.menuItems = data;
                }
            },

            async onLoadMore() {
                const results = await this.handler.onLoadMore(this.model, this.type);

                if (results?.length) {
                    this.model.menuItems.push(...results);
                }
            }
        }
    }
}
