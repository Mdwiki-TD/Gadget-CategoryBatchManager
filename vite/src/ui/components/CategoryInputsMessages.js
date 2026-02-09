/**
 * Category inputs message HTML element creator using Codex CSS-only classes.
 * Creates the HTML elements for displaying add/remove category messages.
 * @see https://doc.wikimedia.org/codex/latest/
 * @class CategoryInputsMessages
 */
class CategoryInputsMessages {
    /**
     */
    constructor() {
    }

    createAddElement() {
        return `
            <!-- Category Add Message -->
            <div v-if="addCategory.message.show" class="margin-bottom-20">
                <cdx-message
                allow-user-dismiss
                :type="addCategory.message.type"
                :inline="false"
                >
                    {{ addCategory.message.text }}
                </cdx-message>
            </div>
        `;
    }

    createRemoveElement() {
        return `
            <!-- Category Remove Message -->
            <div v-if="removeCategory.message.show" class="margin-bottom-20">
                <cdx-message
                allow-user-dismiss
                :type="removeCategory.message.type"
                :inline="false">
                    {{ removeCategory.message.text }}
                </cdx-message>
            </div>
    `;
    }

    hideCategoryMessage(self, msg_type = 'add') {
        console.log(`[CBM] Hiding ${msg_type} category message`);
        if (msg_type === 'add') {
            self.addCategory.message.show = false;
            self.addCategory.message.text = '';
        } else if (msg_type === 'remove') {
            self.removeCategory.message.show = false;
            self.removeCategory.message.text = '';
        }
    }

    displayCategoryMessage(self, text, type = 'error', msg_type = 'add') {
        console.log(`[CBM] Displaying ${msg_type} category message: ${text} (type: ${type})`);
        if (msg_type === 'add') {
            self.addCategory.message.show = true;
            self.addCategory.message.type = type;
            self.addCategory.message.text = text;
        } else if (msg_type === 'remove') {
            self.removeCategory.message.show = true;
            self.removeCategory.message.type = type;
            self.removeCategory.message.text = text;
        }
    }


}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CategoryInputsMessages;
}
