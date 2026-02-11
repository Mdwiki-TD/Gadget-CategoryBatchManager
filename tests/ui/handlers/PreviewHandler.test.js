const { default: PreviewHandler } = require('../../../src/ui/handlers/PreviewHandler');

describe('PreviewHandler', () => {
    let previewHandler;
    let mockChangesHandler;

    beforeEach(() => {
        mockChangesHandler = {
            validateAndPrepare: jest.fn()
        };

        previewHandler = new PreviewHandler(mockChangesHandler);
    });

    describe('constructor', () => {
        test('should initialize with validator and changes_handler', () => {
            expect(previewHandler.changes_helpers).toBe(mockChangesHandler);
        });

        test('should work without optional callbacks', () => {
            expect(() => new PreviewHandler(mockChangesHandler)).not.toThrow();
        });
    });

    describe('filterFilesToProcess', () => {
        test('should map items correctly with all properties', () => {
            const inputItems = [
                {
                    file: 'File:Test1.svg',
                    currentCategories: ['Category A', 'Category B'],
                    newCategories: ['Category A', 'Category B', 'Category C']
                },
                {
                    file: 'File:Test2.svg',
                    currentCategories: ['Category X'],
                    newCategories: ['Category Y']
                }
            ];

            const result = previewHandler.filterFilesToProcess(inputItems);

            expect(result).toEqual([
                {
                    file: 'File:Test1.svg',
                    currentCategories: ['Category A', 'Category B'],
                    newCategories: ['Category A', 'Category B', 'Category C'],
                    diff: 1
                },
                {
                    file: 'File:Test2.svg',
                    currentCategories: ['Category X'],
                    newCategories: ['Category Y'],
                    diff: 0
                }
            ]);
        });

        test('should calculate diff correctly for additions', () => {
            const inputItems = [
                {
                    file: 'File:Test.svg',
                    currentCategories: ['A'],
                    newCategories: ['A', 'B', 'C']
                }
            ];

            const result = previewHandler.filterFilesToProcess(inputItems);

            expect(result[0].diff).toBe(2);
        });

        test('should calculate diff correctly for removals', () => {
            const inputItems = [
                {
                    file: 'File:Test.svg',
                    currentCategories: ['A', 'B', 'C'],
                    newCategories: ['A']
                }
            ];

            const result = previewHandler.filterFilesToProcess(inputItems);

            expect(result[0].diff).toBe(-2);
        });

        test('should calculate diff correctly for no change', () => {
            const inputItems = [
                {
                    file: 'File:Test.svg',
                    currentCategories: ['A', 'B'],
                    newCategories: ['A', 'B']
                }
            ];

            const result = previewHandler.filterFilesToProcess(inputItems);

            expect(result[0].diff).toBe(0);
        });

        test('should create copies of arrays to avoid reference issues', () => {
            const inputItems = [
                {
                    file: 'File:Test.svg',
                    currentCategories: ['A'],
                    newCategories: ['A', 'B']
                }
            ];

            const result = previewHandler.filterFilesToProcess(inputItems);

            // Modify original arrays
            inputItems[0].currentCategories.push('C');
            inputItems[0].newCategories.push('D');

            // Result should be unchanged
            expect(result[0].currentCategories).toEqual(['A']);
            expect(result[0].newCategories).toEqual(['A', 'B']);
        });

        test('should handle empty array', () => {
            const result = previewHandler.filterFilesToProcess([]);

            expect(result).toEqual([]);
        });

        test('should handle single item with empty categories', () => {
            const inputItems = [
                {
                    file: 'File:Test.svg',
                    currentCategories: [],
                    newCategories: []
                }
            ];

            const result = previewHandler.filterFilesToProcess(inputItems);

            expect(result).toEqual([
                {
                    file: 'File:Test.svg',
                    currentCategories: [],
                    newCategories: [],
                    diff: 0
                }
            ]);
        });

        test('should handle multiple items with varying diffs', () => {
            const inputItems = [
                { file: 'File1.svg', currentCategories: ['A'], newCategories: ['A', 'B', 'C'] },
                { file: 'File2.svg', currentCategories: ['X', 'Y'], newCategories: ['X'] },
                { file: 'File3.svg', currentCategories: ['M'], newCategories: ['M', 'N'] },
                { file: 'File4.svg', currentCategories: ['P', 'Q'], newCategories: ['P', 'Q'] }
            ];

            const result = previewHandler.filterFilesToProcess(inputItems);

            expect(result[0].diff).toBe(2);
            expect(result[1].diff).toBe(-1);
            expect(result[2].diff).toBe(1);
            expect(result[3].diff).toBe(0);
        });
    });
});
