/**
 * Progress bar UI component using Codex CSS-only classes.
 * @see https://doc.wikimedia.org/codex/latest/
 * @class ProgressBar
 */
class ProgressBar {
    /**
     */
    constructor() {
    }

    /**
     * Create the HTML structure for the progress section
     */
    createElement() {
        return `
        <div v-if="showProgress" class="cbm-progress-section">
            <div class="cbm-progress-bar-bg">
                <div class="cbm-progress-bar-fill"
                    :style="{ width: progressPercent + '%' }">
                </div>
            </div>
            <div class="cbm-progress-text">
                {{ progressText }}
            </div>
        </div>
    `;
    }

    /**
     * Attach event listeners
     */
    attachListeners() {
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProgressBar;
}
