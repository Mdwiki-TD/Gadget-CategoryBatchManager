/**
 * Progress bar UI component using Codex CSS-only classes.
 * @see https://doc.wikimedia.org/codex/latest/
 */

function MessageDisplayPanel() {
    const app = {
        data: function () {
            return {
                showMessage: false,
                messageType: '',
                messageContent: '',
                messageKey: 0
            };
        },
        template: `
            <!-- Message Display -->
            <div v-if="showMessage" class="cbm-fixed-message">
                <cdx-message
                :key="messageKey"
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
            handleMessageDismiss: function () {
                this.showMessage = false;
                this.messageContent = '';
            },

            resetMessageState: function () {
                this.showMessage = false;
                this.messageType = '';
                this.messageContent = '';
            },

            renderMessage: function (message, type = 'info') {
                console.warn(`[CBM] ${type}:`, message);

                // Hide first to trigger reactivity if it was already showing
                this.showMessage = false;

                this.$nextTick(() => {
                    this.messageType = type;
                    this.messageContent = message;
                    this.messageKey++; // Increment key to force component re-render
                    this.showMessage = true;
                });
            },

            showWarningMessage: function (message) {
                this.renderMessage(message, 'warning');
            },

            showErrorMessage: function (message) {
                this.renderMessage(message, 'error');
            },

            showSuccessMessage: function (message) {
                this.renderMessage(message, 'success');
            }
        }
    }
    return app;
}

export default MessageDisplayPanel;
