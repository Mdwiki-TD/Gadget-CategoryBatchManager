// Mock ChangeCalculator module before importing ChangesHelper
jest.mock('../../../src/utils/ChangeCalculator', () => ({
    filterFilesThatWillChange: jest.fn()
}));

const { default: ChangesHelper } = require('../../../src/ui/helpers/ChangesHelper');
const { filterFilesThatWillChange } = require('../../../src/utils/ChangeCalculator');

describe('ChangesHelper', () => {
    let handler;
    let mockValidator;
    let mockConsoleLog;

    beforeEach(() => {
        // Suppress console.log in tests
        mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => { });

        mockValidator = {
            hasDuplicateCategories: jest.fn(),
            filterCircularCategories: jest.fn()
        };
        handler = new ChangesHelper(mockValidator);
    });

    afterEach(() => {
        mockConsoleLog.mockRestore();
    });

    describe('validateOperation', () => {
        test('should return valid when selectedFiles and categories provided', () => {
            const result = handler.validateOperation(
                [{ title: 'File:Test.svg' }],
                ['Category:A'],
                ['Category:B']
            );

            expect(result).toEqual({ valid: true });
        });

        test('should return error when no files selected', () => {
            const result = handler.validateOperation(
                [],
                ['Category:A'],
                []
            );

            expect(result).toEqual({
                valid: false,
                error: 'Please select at least one file.'
            });
        });

        test('should return error when selectedFiles is null', () => {
            const result = handler.validateOperation(
                null,
                ['Category:A'],
                []
            );

            expect(result).toEqual({
                valid: false,
                error: 'Please select at least one file.'
            });
        });

        test('should return error when no categories to add or remove', () => {
            const result = handler.validateOperation(
                [{ title: 'File:Test.svg' }],
                [],
                []
            );

            expect(result).toEqual({
                valid: false,
                error: 'Please specify categories to add or remove.'
            });
        });

        test('should return valid when only categories to add', () => {
            const result = handler.validateOperation(
                [{ title: 'File:Test.svg' }],
                ['Category:A'],
                []
            );

            expect(result).toEqual({ valid: true });
        });

        test('should return valid when only categories to remove', () => {
            const result = handler.validateOperation(
                [{ title: 'File:Test.svg' }],
                [],
                ['Category:B']
            );

            expect(result).toEqual({ valid: true });
        });
    });

    describe('prepareOperation', () => {
        let selectedFiles;
        let addCategories;
        let removeCategories;

        beforeEach(() => {
            selectedFiles = [
                { title: 'File:Test1.svg', currentCategories: ['Category:A'] },
                { title: 'File:Test2.svg', currentCategories: ['Category:B'] }
            ];
            addCategories = ['Category:C'];
            removeCategories = ['Category:D'];

            mockValidator.hasDuplicateCategories.mockReturnValue({ valid: true });
            mockValidator.filterCircularCategories.mockReturnValue({
                validAddCategories: ['Category:C'],
                circularCategories: []
            });
            filterFilesThatWillChange.mockReturnValue(selectedFiles);
        });

        test('should prepare operation successfully', () => {
            const result = handler.prepareOperation(
                'Category:Source',
                selectedFiles,
                addCategories,
                removeCategories
            );

            expect(result).toEqual({
                valid: true,
                validAddCategories: ['Category:C'],
                removeCategories: ['Category:D'],
                filesCount: 2,
                filesToProcess: selectedFiles
            });
        });

        test('should return error when duplicate categories detected', () => {
            mockValidator.hasDuplicateCategories.mockReturnValue({
                valid: false,
                duplicates: ['Category:Test']
            });

            const result = handler.prepareOperation(
                'Category:Source',
                selectedFiles,
                addCategories,
                removeCategories
            );

            expect(result).toEqual({
                valid: false,
                error: 'Cannot add and remove the same category: "Category:Test". Please remove it from one of the lists.'
            });
        });

        test('should return error when all categories are circular', () => {
            mockValidator.filterCircularCategories.mockReturnValue({
                validAddCategories: [],
                circularCategories: ['Category:C']
            });

            const result = handler.prepareOperation(
                'Category:Source',
                selectedFiles,
                addCategories,
                removeCategories
            );

            expect(result).toEqual({
                valid: false,
                error: 'Circular categories detected.',
                message: '❌ Cannot add: all categorie(s) are circular references to the current page. Cannot add "Category:C" to itself.'
            });
        });

        test('should return valid with empty files when no files will change', () => {
            mockValidator.filterCircularCategories.mockReturnValue({
                validAddCategories: ['Category:C'],
                circularCategories: []
            });

            // When no files will change
            filterFilesThatWillChange.mockReturnValue([]);

            const result = handler.prepareOperation(
                'Category:Source',
                selectedFiles,
                ['Category:C'],
                []
            );

            // The implementation returns valid: true with 0 files count
            expect(result.valid).toBe(true);
            expect(result.filesCount).toBe(0);
            expect(result.filesToProcess).toEqual([]);
        });

        test('should filter circular categories from add list', () => {
            mockValidator.filterCircularCategories.mockReturnValue({
                validAddCategories: ['Category:C'], // Some categories filtered
                circularCategories: ['Category:Circular']
            });

            const result = handler.prepareOperation(
                'Category:Source',
                selectedFiles,
                ['Category:C', 'Category:Circular'],
                removeCategories
            );

            expect(result.validAddCategories).toEqual(['Category:C']);
            expect(mockValidator.filterCircularCategories).toHaveBeenCalledWith(
                ['Category:C', 'Category:Circular'],
                'Category:Source'
            );
        });
    });

    describe('validateAndPrepare', () => {
        let selectedFiles;
        let addCategories;
        let removeCategories;
        let mockCallbacks;

        beforeEach(() => {
            selectedFiles = [{ title: 'File:Test.svg' }];
            addCategories = ['Category:A'];
            removeCategories = [];

            mockValidator.hasDuplicateCategories.mockReturnValue({ valid: true });
            mockValidator.filterCircularCategories.mockReturnValue({
                validAddCategories: ['Category:A'],
                circularCategories: []
            });
            filterFilesThatWillChange.mockReturnValue(selectedFiles);

            mockCallbacks = {
                showWarningMessage: jest.fn(),
                onWarning: jest.fn(),
                onError: jest.fn(),
            };
        });

        test('should return preparation result when validation passes', () => {
            const result = handler.validateAndPrepare(
                'Category:Source',
                selectedFiles,
                addCategories,
                removeCategories,
                mockCallbacks
            );

            expect(result).toEqual({
                valid: true,
                validAddCategories: ['Category:A'],
                removeCategories: [],
                filesCount: 1,
                filesToProcess: selectedFiles
            });
            expect(mockCallbacks.showWarningMessage).not.toHaveBeenCalled();
        });

        test('should call showWarningMessage when validation fails', () => {
            const result = handler.validateAndPrepare(
                'Category:Source',
                [], // Empty files - validation will fail
                addCategories,
                removeCategories,
                mockCallbacks
            );

            expect(result).toBeUndefined();
            expect(mockCallbacks.showWarningMessage).toHaveBeenCalledWith(
                'Please select at least one file.'
            );
        });

        test('should call onError when preparation fails with message', () => {
            mockValidator.filterCircularCategories.mockReturnValue({
                validAddCategories: [],
                circularCategories: ['Category:A']
            });

            const result = handler.validateAndPrepare(
                'Category:Source',
                selectedFiles,
                addCategories,
                removeCategories,
                mockCallbacks
            );

            expect(result).toBeUndefined();
            expect(mockCallbacks.onError).toHaveBeenCalledTimes(1);
            expect(mockCallbacks.onError).toHaveBeenNthCalledWith(1, expect.stringContaining('all categorie(s) are circular'));
            expect(mockCallbacks.onWarning).toHaveBeenNthCalledWith(1, 'Circular categories detected.');
        });

        test('should call onWarning when preparation fails without message', () => {
            mockValidator.filterCircularCategories.mockReturnValue({
                validAddCategories: [],
                circularCategories: []
            });

            const result = handler.validateAndPrepare(
                'Category:Source',
                selectedFiles,
                addCategories,
                removeCategories,
                mockCallbacks
            );

            expect(result).toBeUndefined();
            expect(mockCallbacks.onWarning).toHaveBeenCalledWith('No valid categories to add or remove.');
        });

        test('should handle missing callbacks gracefully', () => {
            const result = handler.validateAndPrepare(
                'Category:Source',
                selectedFiles,
                addCategories,
                removeCategories,
                {}
            );

            expect(result).toBeDefined();
            expect(result.valid).toBe(true);
        });

        test('should use default callbacks when not provided', () => {
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

            handler.validateAndPrepare(
                'Category:Source',
                selectedFiles,
                addCategories,
                removeCategories
            );

            expect(consoleLogSpy).toHaveBeenCalledWith('validateAndPrepare start');

            consoleLogSpy.mockRestore();
        });
    });
});
