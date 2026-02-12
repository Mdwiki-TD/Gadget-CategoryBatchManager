/**
 * Execute Progress Panel
 * Displays batch execution progress bar and status text
 * @returns {Object} Vue component configuration
 */
function ExecuteProgressPanel() {
    return {
        props: {
            isProcessing: {
                type: Boolean,
                default: false
            },
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
            <div v-if="isProcessing || progressText !== ''"
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

export default ExecuteProgressPanel;
