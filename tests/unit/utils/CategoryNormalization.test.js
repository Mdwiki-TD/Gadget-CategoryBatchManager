const WikitextParser = require('../../../src/utils/WikitextParser');

// Make WikitextParser available globally
global.WikitextParser = WikitextParser;

describe('Category Normalization - Spaces vs Underscores', () => {
    let parser;

    beforeEach(() => {
        parser = new WikitextParser();
    });

    describe('Real-world scenario: Afghanistan graphs', () => {
        const wikitextWithSpaces = `{{Chart showing old data|start=1990|end=2020}}
=={{int:license-header}}==
{{cc-by-4.0}}
[[Category:Uploaded by OWID importer tool]]
[[Category:Our World in Data graphs of Afghanistan]]`;

        test('should detect category with spaces when user input has underscores', () => {
            // User input: Category:Our_World_in_Data_graphs_of_Afghanistan
            const userInput = 'Our_World_in_Data_graphs_of_Afghanistan';

            const hasCategory = parser.hasCategory(wikitextWithSpaces, userInput);

            expect(hasCategory).toBe(true);
        });

        test('should remove category with spaces when user input has underscores', () => {
            const userInput = 'Our_World_in_Data_graphs_of_Afghanistan';

            const result = parser.removeCategory(wikitextWithSpaces, userInput);

            expect(result).not.toContain('[[Category:Our World in Data graphs of Afghanistan]]');
            expect(result).toContain('[[Category:Uploaded by OWID importer tool]]');
        });

        test('should add category and remove category in single operation', () => {
            const toAdd = 'test';
            const toRemove = 'Our_World_in_Data_graphs_of_Afghanistan';

            let result = parser.removeCategory(wikitextWithSpaces, toRemove);
            result = parser.addCategory(result, toAdd);

            expect(result).not.toContain('[[Category:Our World in Data graphs of Afghanistan]]');
            expect(result).toContain('[[Category:test]]');
            expect(result).toContain('[[Category:Uploaded by OWID importer tool]]');
        });
    });

    describe('Normalization behavior', () => {
        test('should treat spaces and underscores as equivalent', () => {
            const wikitextVariants = [
                '[[Category:Our World in Data]]',
                '[[Category:Our_World_in_Data]]'
            ];

            wikitextVariants.forEach(wikitext => {
                // Both should be detected with input containing spaces
                expect(parser.hasCategory(wikitext, 'Our World in Data')).toBe(true);
                // Both should be detected with input containing underscores
                expect(parser.hasCategory(wikitext, 'Our_World_in_Data')).toBe(true);
            });
        });

        test('should remove category regardless of space/underscore format', () => {
            const wikitextWithSpaces = 'Text\n[[Category:Our World in Data]]\nMore';
            const wikitextWithUnderscores = 'Text\n[[Category:Our_World_in_Data]]\nMore';

            // Remove with underscores from spaces
            let result1 = parser.removeCategory(wikitextWithSpaces, 'Our_World_in_Data');
            expect(result1).not.toContain('[[Category:Our World in Data]]');

            // Remove with spaces from underscores
            let result2 = parser.removeCategory(wikitextWithUnderscores, 'Our World in Data');
            expect(result2).not.toContain('[[Category:Our_World_in_Data]]');
        });

        test('should not add duplicate if category exists with different format', () => {
            const wikitext = '[[Category:Our World in Data]]';

            // Try to add with underscores
            const result = parser.addCategory(wikitext, 'Our_World_in_Data');

            // Should not add duplicate
            const categoryCount = (result.match(/\[\[Category:Our[_ ]World[_ ]in[_ ]Data\]\]/g) || []).length;
            expect(categoryCount).toBe(1);
        });
    });

    describe('Edge cases', () => {
        test('should handle multiple spaces', () => {
            const wikitext = '[[Category:Our  World   in    Data]]'; // Multiple spaces

            expect(parser.hasCategory(wikitext, 'Our_World_in_Data')).toBe(true);
            expect(parser.hasCategory(wikitext, 'Our World in Data')).toBe(true);
        });

        test('should handle mixed underscores and spaces', () => {
            const wikitext = '[[Category:Our_World in Data]]'; // Mixed

            expect(parser.hasCategory(wikitext, 'Our_World_in_Data')).toBe(true);
            expect(parser.hasCategory(wikitext, 'Our World in Data')).toBe(true);
        });

        test('should preserve other categories when removing', () => {
            const wikitext = `[[Category:Keep this one]]
[[Category:Our World in Data graphs of Afghanistan]]
[[Category:Keep this too]]`;

            const result = parser.removeCategory(wikitext, 'Our_World_in_Data_graphs_of_Afghanistan');

            expect(result).toContain('[[Category:Keep this one]]');
            expect(result).toContain('[[Category:Keep this too]]');
            expect(result).not.toContain('Afghanistan');
        });
    });

    describe('Edit summary accuracy', () => {
        test('should only report what actually changed', () => {
            const wikitext = `[[Category:Existing]]`;

            // Try to add existing category
            const hasExisting = parser.hasCategory(wikitext, 'Existing');
            const result = parser.addCategory(wikitext, 'Existing');

            // Should detect it already exists
            expect(hasExisting).toBe(true);
            // Should not modify wikitext
            expect(result).toBe(wikitext);
        });

        test('should detect when removal fails (category not found)', () => {
            const wikitext = `[[Category:Something]]`;

            const hasCat = parser.hasCategory(wikitext, 'Non_Existent_Category');
            const result = parser.removeCategory(wikitext, 'Non_Existent_Category');

            // Should not find it
            expect(hasCat).toBe(false);
            // Should not modify wikitext
            expect(result).toBe(wikitext);
        });

        test('should accurately report combined operation', () => {
            const wikitext = `[[Category:Old Category]]
[[Category:Keep This]]`;

            const toAdd = ['New_Category'];
            const toRemove = ['Old_Category'];

            // Check what exists before
            const hadOld = parser.hasCategory(wikitext, toRemove[0]);
            const hadNew = parser.hasCategory(wikitext, toAdd[0]);

            // Perform operations
            let result = wikitext;
            for (const cat of toRemove) {
                result = parser.removeCategory(result, cat);
            }
            for (const cat of toAdd) {
                if (!parser.hasCategory(result, cat)) {
                    result = parser.addCategory(result, cat);
                }
            }

            // Verify expectations
            expect(hadOld).toBe(true);  // Old existed
            expect(hadNew).toBe(false); // New didn't exist
            expect(result).not.toContain('[[Category:Old Category]]');
            expect(result).toContain('[[Category:New Category]]');
            expect(result).toContain('[[Category:Keep This]]');
        });
    });

    describe('Category prefix handling', () => {
        test('should handle Category: prefix in input', () => {
            const wikitext = '[[Category:Our World in Data]]';

            // With prefix
            expect(parser.hasCategory(wikitext, 'Category:Our_World_in_Data')).toBe(true);

            // Without prefix
            expect(parser.hasCategory(wikitext, 'Our_World_in_Data')).toBe(true);
        });

        test('should remove with or without Category: prefix', () => {
            const wikitext = 'Text\n[[Category:Our World in Data]]\nMore';

            // Remove with prefix
            const result1 = parser.removeCategory(wikitext, 'Category:Our_World_in_Data');
            expect(result1).not.toContain('[[Category:Our World in Data]]');

            // Remove without prefix
            const result2 = parser.removeCategory(wikitext, 'Our_World_in_Data');
            expect(result2).not.toContain('[[Category:Our World in Data]]');
        });

        test('should remove with or without Category: prefix', () => {
            const wikitext = 'Text\n[[Category:Our World in Data|test]]\nMore';

            // Remove with prefix
            const result1 = parser.removeCategory(wikitext, 'Category:Our_World_in_Data');
            expect(result1).not.toContain('[[Category:Our World in Data');

            // Remove without prefix
            const result2 = parser.removeCategory(wikitext, 'Our_World_in_Data');
            expect(result2).not.toContain('[[Category:Our World in Data');
        });
    });

    describe('Case sensitivity', () => {
        test('should be case-insensitive for first character (MediaWiki behavior)', () => {
            const wikitext = '[[Category:Our world in data]]';

            // MediaWiki treats "our" and "Our" as same
            expect(parser.hasCategory(wikitext, 'Our_world_in_data')).toBe(true);
            expect(parser.hasCategory(wikitext, 'our_world_in_data')).toBe(true);
        });
    });

    describe('Real scenario validation', () => {
        test('REAL BUG: User adds with underscores, page has spaces - should work', () => {
            const originalWikitext = `{{Chart showing old data|start=1990|end=2020}}
=={{int:license-header}}==
{{cc-by-4.0}}
[[Category:Uploaded by OWID importer tool]]
[[Category:Our World in Data graphs of Afghanistan]]`;

            // User input (with underscores)
            const userAddInput = 'Category:test';
            const userRemoveInput = 'Category:Our_World_in_Data_graphs_of_Afghanistan';

            // Simulate operation
            let result = originalWikitext;

            // Remove (should work despite format difference)
            result = parser.removeCategory(result, userRemoveInput);

            // Add
            if (!parser.hasCategory(result, userAddInput)) {
                result = parser.addCategory(result, userAddInput);
            }

            // Expected result
            const expectedWikitext = `{{Chart showing old data|start=1990|end=2020}}
=={{int:license-header}}==
{{cc-by-4.0}}
[[Category:Uploaded by OWID importer tool]]
[[Category:test]]`;

            expect(result.trim()).toBe(expectedWikitext.trim());
        });

        test('Edit summary should reflect actual changes only', () => {
            const wikitext = `[[Category:Existing]]
[[Category:Our World in Data]]`;

            const toAdd = ['Existing', 'New_One']; // One exists, one new
            const toRemove = ['Our_World_in_Data', 'Non_Existent']; // One exists, one doesn't

            let result = wikitext;
            const actuallyAdded = [];
            const actuallyRemoved = [];

            // Remove
            for (const cat of toRemove) {
                const before = result;
                result = parser.removeCategory(result, cat);
                if (result !== before) {
                    actuallyRemoved.push(cat);
                }
            }

            // Add
            for (const cat of toAdd) {
                if (!parser.hasCategory(result, cat)) {
                    result = parser.addCategory(result, cat);
                    actuallyAdded.push(cat);
                }
            }

            // Verify only actual changes are reported
            expect(actuallyAdded).toEqual(['New_One']); // Only new one added
            expect(actuallyRemoved).toEqual(['Our_World_in_Data']); // Only existing one removed

            // Generate accurate summary
            const summaryParts = [];
            if (actuallyAdded.length) summaryParts.push(`+${actuallyAdded.join(', ')}`);
            if (actuallyRemoved.length) summaryParts.push(`-${actuallyRemoved.join(', ')}`);
            const summary = `Batch category update: ${summaryParts.join('; ')}`;

            expect(summary).toBe('Batch category update: +New_One; -Our_World_in_Data');
            expect(summary).not.toContain('Existing'); // Shouldn't mention existing
            expect(summary).not.toContain('Non_Existent'); // Shouldn't mention non-existent
        });
    });
});
