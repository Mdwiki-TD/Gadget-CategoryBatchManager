/**
 * Preview Handler
 *
 * @description
 * Handles all preview-related functionality for BatchManager.
 * Manages preview generation, modal display, and validation.
 *
 * @requires ValidationHelper - For common validation logic
 * @requires ChangesHelper - For preparing and validating category changes before preview
 */

import { ChangesHelper } from "../helpers";

class PreviewHandler {
    /**
     * @param {ChangesHelper} changes_helpers - Changes helper instance
     */
    constructor(changes_helpers) {
        this.changes_helpers = changes_helpers;
    }
    /**
     * Handle preview button click
     * Generates and displays a preview of category changes
     */

    getPreparation(
        sourceCategory,
        selectedFiles,
        addCategorySelected,
        removeCategorySelected,
        callbacks = {}
    ) {
        const preparation = this.changes_helpers.validateAndPrepare(
            sourceCategory,
            selectedFiles,
            addCategorySelected,
            removeCategorySelected,
            callbacks
        );
        if (!preparation) {
            return
        }
    }

    filterFilesToProcess(filesToProcess) {
        return filesToProcess
            .map(item => ({
                file: item.file,
                currentCategories: [...item.currentCategories],
                newCategories: [...item.newCategories],
                diff: item.newCategories.length - item.currentCategories.length
            }));
    }
}

export default PreviewHandler;
