/**
 * Parse and modify wikitext for category operations
 * @class WikitextParser
 */
class WikitextParser {
    /**
     * TODO: use it in the workflow
     * Extract all categories from wikitext
     * @param {string} wikitext - The wikitext content
     * @returns {Array<string>} Array of category names with "Category:" prefix
     */
    extractCategories(wikitext) {
        const categoryRegex = /\[\[Category:([^\]|]+)(?:\|[^\]]*)?\]\]/gi;
        const matches = [];
        let match;

        while ((match = categoryRegex.exec(wikitext)) !== null) {
            matches.push(`Category:${this.normalize(match[1].trim())}`);
        }

        return matches;
    }
    /**
     * Normalize category name by replacing underscores with spaces and trimming
     * @param {string} categoryName - Category name to normalize
     * @returns {string} Normalized category name
     */
    normalize(categoryName) {
        return categoryName.replace(/_/g, ' ').trim();
    }

    /**
     * Check if category exists in wikitext
     * @param {string} wikitext - The wikitext content
     * @param {string} categoryName - Category name to check (with or without "Category:" prefix)
     * @returns {boolean} True if category exists
     */
    hasCategory(wikitext, categoryName) {
        const cleanName = categoryName.replace(/^Category:/i, '');
        const normalizedName = this.normalize(cleanName);

        // Create a pattern that matches both spaces and underscores
        const pattern = normalizedName.split(' ').map(part => this.escapeRegex(part)).join('[ _]+');
        const regex = new RegExp(
            `\\[\\[Category:${pattern}(?:\\|[^\\]]*)?\\]\\]`,
            'i'
        );
        return regex.test(wikitext);
    }
    /**
     * Add a category to wikitext
     * @param {string} wikitext - The wikitext content
     * @param {string} categoryName - Category name to add (with or without "Category:" prefix)
     * @returns {string} Modified wikitext
     */
    addCategory(wikitext, categoryName) {
        const cleanName = categoryName.replace(/^Category:/i, '');
        const normalizedName = this.normalize(cleanName);

        // Check if category already exists (with normalization)
        if (this.hasCategory(wikitext, normalizedName)) {
            return wikitext;
        }

        const categorySyntax = `[[Category:${normalizedName}]]`;

        // Find last category or end of file
        const lastCategoryMatch = wikitext.match(/\[\[Category:[^\]]+\]\]\s*$/);

        if (lastCategoryMatch) {
            // Add after last category
            return wikitext.replace(
                /(\[\[Category:[^\]]+\]\])\s*$/,
                `$1\n${categorySyntax}\n`
            );
        } else {
            // Add at end
            return wikitext.trim() + `\n${categorySyntax}\n`;
        }
    }
    /**
     * Remove a category from wikitext
     * @param {string} wikitext - The wikitext content
     * @param {string} categoryName - Category name to remove (with or without "Category:" prefix)
     * @returns {string} Modified wikitext
     */
    removeCategory(wikitext, categoryName) {
        const cleanName = categoryName.replace(/^Category:/i, '');
        const normalizedName = this.normalize(cleanName);

        // Create a pattern that matches both spaces and underscores
        const pattern = normalizedName.split(' ').map(part => this.escapeRegex(part)).join('[ _]+');
        const regex = new RegExp(
            `\\[\\[Category:${pattern}(?:\\|[^\\]]*)?\\]\\]\\s*\\n?`,
            'gi'
        );
        return wikitext.replace(regex, '');
    }

    /**
     * Escape special regex characters in a string
     * @param {string} string - String to escape
     * @returns {string} Escaped string
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * TODO: use it in the workflow
     * Get the proper wikitext syntax for a category
     * @param {string} categoryName - Category name (with or without "Category:" prefix)
     * @returns {string} Wikitext category syntax
     */
    getCategorySyntax(categoryName) {
        const cleanName = categoryName.replace(/^Category:/i, '');
        return `[[Category:${cleanName}]]`;
    }
}

export default WikitextParser;
