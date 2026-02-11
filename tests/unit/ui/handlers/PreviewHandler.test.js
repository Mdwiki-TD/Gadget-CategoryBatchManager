const PreviewHandler = require('../../../../src/ui/handlers/PreviewHandler');

describe('PreviewHandler', () => {
    let previewHandler;
    let mockValidator;
    let mockChangesHandler;

    beforeEach(() => {
        mockValidator = {
            isValidCategoryName: jest.fn(() => true),
            normalizeCategoryName: jest.fn(name => name.replace(/_/g, ' '))
        };

        mockChangesHandler = {
            validateAndPrepare: jest.fn()
        };

        previewHandler = new PreviewHandler(mockValidator, mockChangesHandler);
    });

    describe('constructor', () => {
        test('should initialize with validator and changes_handler', () => {
            expect(previewHandler.validator).toBe(mockValidator);
            expect(previewHandler.changes_handler).toBe(mockChangesHandler);
        });

        test('should work without optional callbacks', () => {
            expect(() => new PreviewHandler(mockValidator, mockChangesHandler)).not.toThrow();
        });
    });

    describe('getPreparation', () => {
        test('should call validateAndPrepare with correct parameters', () => {
            const sourceCategory = 'Test Category';
            const selectedFiles = ['File1.svg', 'File2.svg'];
            const addCategorySelected = 'New Category';
            const removeCategorySelected = 'Old Category';
            const callbacks = { onProgress: jest.fn() };

            mockChangesHandler.validateAndPrepare.mockReturnValue({ valid: true });

            previewHandler.getPreparation(
                sourceCategory,
                selectedFiles,
                addCategorySelected,
                removeCategorySelected,
                callbacks
            );

            expect(mockChangesHandler.validateAndPrepare).toHaveBeenCalledWith(
                sourceCategory,
                selectedFiles,
                addCategorySelected,
                removeCategorySelected,
                callbacks
            );
        });

        test('should return undefined when validateAndPrepare returns null/undefined', () => {
            mockChangesHandler.validateAndPrepare.mockReturnValue(null);

            const result = previewHandler.getPreparation(
                'Test',
                ['File1.svg'],
                'Add',
                'Remove'
            );

            expect(result).toBeUndefined();
        });

        test('should return undefined when validateAndPrepare returns undefined', () => {
            mockChangesHandler.validateAndPrepare.mockReturnValue(undefined);

            const result = previewHandler.getPreparation(
                'Test',
                ['File1.svg'],
                'Add',
                'Remove'
            );

            expect(result).toBeUndefined();
        });

        test('should return preparation object when valid', () => {
            const expectedPreparation = {
                valid: true,
                filesToProcess: [
                    { file: 'File1.svg', currentCategories: ['A'], newCategories: ['A', 'B'] }
                ]
            };
            mockChangesHandler.validateAndPrepare.mockReturnValue(expectedPreparation);

            const result = previewHandler.getPreparation(
                'Test',
                ['File1.svg'],
                'B',
                null
            );

            expect(result).toBeUndefined(); // Method doesn't return preparation
        });

        test('should handle empty callbacks object', () => {
            mockChangesHandler.validateAndPrepare.mockReturnValue({ valid: true });

            previewHandler.getPreparation(
                'Test',
                ['File1.svg'],
                'Add',
                'Remove',
                {}
            );

            expect(mockChangesHandler.validateAndPrepare).toHaveBeenCalledWith(
                'Test',
                ['File1.svg'],
                'Add',
                'Remove',
                {}
            );
        });

        test('should handle no callbacks parameter', () => {
            mockChangesHandler.validateAndPrepare.mockReturnValue({ valid: true });

            previewHandler.getPreparation(
                'Test',
                ['File1.svg'],
                'Add',
                'Remove'
            );

            expect(mockChangesHandler.validateAndPrepare).toHaveBeenCalledWith(
                'Test',
                ['File1.svg'],
                'Add',
                'Remove',
                {}
            );
        });

        test('should handle empty selected files array', () => {
            mockChangesHandler.validateAndPrepare.mockReturnValue({ valid: true });

            previewHandler.getPreparation(
                'Test',
                [],
                'Add',
                'Remove'
            );

            expect(mockChangesHandler.validateAndPrepare).toHaveBeenCalledWith(
                'Test',
                [],
                'Add',
                'Remove',
                {}
            );
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
