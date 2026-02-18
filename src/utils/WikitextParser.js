/**
 * Parses and transforms wikitext for category add/remove operations.
 * Handles spaces/underscores interchangeably when matching existing categories.
 * @class WikitextParser
 */
class WikitextParser {
    /**
     * Normalise a raw category name: replace underscores with spaces and trim.
     * @param {string} name
     * @returns {string}
     */
    normalize(name) {
        return name.replace(/_/g, ' ').trim();
    }

    /**
     * Escape all RegExp special characters in a string.
     * @param {string} str
     * @returns {string}
     */
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Build a RegExp that matches a category link regardless of whether
     * the name uses spaces or underscores.
     * @param {string} normalizedName - Name already normalized (spaces, no prefix)
     * @returns {RegExp}
     */
    _buildCategoryRegex(normalizedName) {
        const pattern = normalizedName
            .split(' ')
            .map(part => this.escapeRegex(part))
            .join('[ _]+');
        return new RegExp(`\\[\\[Category:${pattern}(?:\\|[^\\]]*)?\\]\\]`, 'gi');
    }
    /**
     * Return true if `wikitext` already contains a link to `categoryName`.
     * @param {string} wikitext
     * @param {string} categoryName - With or without "Category:" prefix
     * @returns {boolean}
     */
    hasCategory(wikitext, categoryName) {
        const normalized = this.normalize(categoryName.replace(/^Category:/i, ''));
        return this._buildCategoryRegex(normalized).test(wikitext);
    }

    /**
     * Append `categoryName` to `wikitext` after the last existing category,
     * or at the end of the file when no categories exist yet.
     * Does nothing if the category is already present.
     * @param {string} wikitext
     * @param {string} categoryName
     * @returns {string}
     */
    addCategory(wikitext, categoryName) {
        const clean = categoryName.replace(/^Category:/i, '');
        const normalizedName = this.normalize(clean);

        // Check if category already exists (with normalization)
        if (this.hasCategory(wikitext, normalizedName)) {
            return wikitext;
        }

        const syntax = `[[Category:${normalizedName}]]`;

        // Find last category or end of file
        const lastCategoryMatch = wikitext.match(/\[\[Category:[^\]]+\]\]\s*$/);

        if (lastCategoryMatch) {
            // Add after last category
            return wikitext.replace(
                /(\[\[Category:[^\]]+\]\])\s*$/,
                `$1\n${syntax}\n`
            );
        } else {
            // Add at end
            return wikitext.trim() + `\n${syntax}\n`;
        }
    }
    /**
     * Remove all occurrences of `categoryName` from `wikitext`.
     * @param {string} wikitext
     * @param {string} categoryName
     * @returns {string}
     */
    removeCategory(wikitext, categoryName) {
        const cleanName = this.normalize(categoryName.replace(/^Category:/i, ''));

        // Create a pattern that matches both spaces and underscores
        const pattern = cleanName.split(' ').map(part => this.escapeRegex(part)).join('[ _]+');

        const regex = new RegExp(
            `\\[\\[Category:${pattern}(?:\\|[^\\]]*)?\\]\\]\\s*\\n?`,
            'gi'
        );
        return wikitext.replace(regex, '');
    }

}

export default WikitextParser;
