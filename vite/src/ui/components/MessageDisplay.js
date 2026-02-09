/**
 * Progress bar UI component using Codex CSS-only classes.
 * @see https://doc.wikimedia.org/codex/latest/
 * @class MessageDisplay
 */
class MessageDisplay {
    /**
     */
    constructor() {
    }

    /**
     * Create the HTML structure for the progress section
     *
     */
    createElement() {
        // :auto-dismiss="messageType === 'success'"
        return `
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
    `;
    }

    // Message handlers
    resetMessageState() {
        this.showMessage = false;
        this.messageType = '';
        this.messageContent = '';
    }

    renderMessage(message, type = 'info') {
        console.warn(`'[CBM] ${type}:`, message);
        this.messageType = type;
        this.messageContent = message;
        this.showMessage = true;
    }

    showWarningMessage(message) {
        this.renderMessage(message, 'warning');
    }

    showErrorMessage(message) {
        this.renderMessage(message, 'error');
    }

    showSuccessMessage(message) {
        this.renderMessage(message, 'success');
    }

    handleMessageDismiss() {
        this.showMessage = false;
    }

}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MessageDisplay;
}
