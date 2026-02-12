/**
 * Immutable-ish value object representing one Wikimedia Commons file.
 * `selected` is the only field expected to mutate (driven by checkboxes).
 * @class FileModel
 */
class FileModel {
    /**
     * @param {Object}   data
     * @param {string}   data.title
     * @param {number}   data.pageid
     * @param {boolean}  [data.selected=true]
     * @param {string[]} [data.currentCategories=[]]
     * @param {string}   [data.thumbnail='']
     * @param {number}   [data.size=0]
     */
    constructor({ title, pageid, selected = true, currentCategories = [], thumbnail = '', size = 0 }) {
        this.title = title;
        this.pageid = pageid;
        this.selected = selected;
        this.currentCategories = currentCategories;
        this.thumbnail = thumbnail;
        this.size = size;
    }
}

export default FileModel;
