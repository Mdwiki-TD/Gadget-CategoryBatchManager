/**
 * Progress bar UI component using Codex CSS-only classes.
 * @see https://doc.wikimedia.org/codex/latest/
 * @class SearchProgressBar
 */
class SearchProgressBar {
    /**
     */
    constructor() {
    }

    /**
     * Create the HTML structure for the progress section
     * @returns {string} HTML string for the progress section
     */
    createElement() {
        return `
        <div v-if="showSearchProgress" class="cbm-progress-section">
            <div class="cbm-progress-bar-bg">
                <div class="cbm-progress-bar-fill"
                    :style="{ width: searchProgressPercent + '%' }">
                </div>
            </div>
            <div class="cbm-progress-text">
                {{ searchProgressText }}
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
    module.exports = SearchProgressBar;
}
