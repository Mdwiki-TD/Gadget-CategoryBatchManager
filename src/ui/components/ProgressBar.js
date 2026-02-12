/**
 * Progress Bar Component
 * Displays a progress bar with percentage and status text
 * @returns {Object} Vue component configuration
 */
function ProgressBar() {
    return {
        props: {
            visible: {
                type: Boolean,
                default: false
            },
            percent: {
                type: Number,
                default: 0
            },
            text: {
                type: String,
                default: ''
            }
        },
        template: `
            <div v-if="visible || text !== ''"
                    class="cbm-progress-section">
                <div class="cbm-progress-bar-bg">
                    <div class="cbm-progress-bar-fill"
                            :style="{ width: percent + '%' }">
                    </div>
                </div>
                <div class="cbm-progress-text">
                    {{ text }}
                </div>
            </div>
        `
    };
}

export default ProgressBar;
