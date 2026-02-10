/**
 * Progress bar UI component using Codex CSS-only classes.
 * @see https://doc.wikimedia.org/codex/latest/
 */

function MessageDisplay() {
    const app = {
        data: function () {
            return {
                showMessage: false,
                messageType: '',
                messageContent: '',
            };
        },
        template: `
            <!-- Message Display -->
            <div v-if="showMessage" class="cbm-fixed-message">
                <cdx-message
                allow-user-dismiss
                :type="messageType"
                :fade-in="true"
                :auto-dismiss="true"
                :display-time="3000"
                dismiss-button-label="Close"
                @dismissed="handleMessageDismiss"
                >
                    {{ messageContent }}
                </cdx-message>
            </div>
        `,
        methods: {
            // Message handlers
            resetMessageState: function () {
                this.showMessage = false;
                this.messageType = '';
                this.messageContent = '';
            },

            renderMessage: function (message, type = 'info') {
                console.warn(`[CBM] ${type}:`, message);
                this.messageType = type;
                this.messageContent = message;
                this.showMessage = true;
            },

            showWarningMessage: function (message) {
                this.renderMessage(message, 'warning');
            },

            showErrorMessage: function (message) {
                this.renderMessage(message, 'error');
            },

            showSuccessMessage: function (message) {
                this.renderMessage(message, 'success');
            },

            handleMessageDismiss: function () {
                this.showMessage = false;
            }
        }
    }
    return app;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MessageDisplay
}
