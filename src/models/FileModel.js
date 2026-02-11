/**
 * File model representing a Wikimedia Commons file
 * @class FileModel
 */
class FileModel {
    /**
     * @param {Object} data - File data
     * @param {string} data.title - Full file title (e.g., "File:Example,BLR.svg")
     * @param {number} data.pageid - Unique page ID
     * @param {boolean} [data.selected=true] - Whether file is selected for operation
     * @param {Array<string>} [data.currentCategories=[]] - Current categories
     * @param {string} [data.thumbnail=''] - URL to thumbnail
     * @param {number} [data.size=0] - File size in bytes
     */
    constructor(data) {
        this.title = data.title;
        this.pageid = data.pageid;
        this.selected = data.selected !== undefined ? data.selected : true;
        this.currentCategories = data.currentCategories || [];
        this.thumbnail = data.thumbnail || '';
        this.size = data.size || 0;
    }
}

export default FileModel;
