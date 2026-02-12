/**
 * Search Progress Panel
 * Displays search progress bar and status text
 * @returns {Object} Vue component configuration
 */
function SearchProgressPanel() {
    return {
        props: {
            progressPercent: {
                type: Number,
                default: 0
            },
            progressText: {
                type: String,
                default: ''
            }
        },
        template: `
            <div v-if="progressPercent > 0 || progressText !== ''"
                    class="cbm-progress-section">
                <div class="cbm-progress-bar-bg">
                    <div class="cbm-progress-bar-fill"
                            :style="{ width: progressPercent + '%' }">
                    </div>
                </div>
                <div class="cbm-progress-text">
                    {{ progressText }}
                </div>
            </div>
        `
    };
}

export default SearchProgressPanel;
