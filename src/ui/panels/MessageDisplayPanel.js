/**
 * Fixed-position message banner.
 * Mixin-style: exposes `showSuccessMessage`, `showWarningMessage`,
 * `showErrorMessage` to the parent component.
 * @returns {Object} Partial Vue app configuration
 */
function MessageDisplayPanel() {
    const app = {
        data() {
            return {
                showMessage: false,
                messageType: '',
                messageContent: '',
                messageKey: 0,
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
            handleMessageDismiss() {
                this.showMessage = false;
                this.messageContent = '';
            },
            _renderMessage(message, type = 'info') {
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

            showWarningMessage(message) {
                this._renderMessage(message, 'warning');
            },

            showErrorMessage(message) {
                this._renderMessage(message, 'error');
            },

            showSuccessMessage(message) {
                this._renderMessage(message, 'success');
            }
        }
    }
    return app;
}

export default MessageDisplayPanel;
