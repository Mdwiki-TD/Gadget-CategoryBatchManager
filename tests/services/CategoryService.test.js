const { default: CategoryService } = require('../../src/services/CategoryService');
const { default: WikitextParser } = require('../../src/utils/WikitextParser');

// Make WikitextParser available globally for CategoryService
global.WikitextParser = WikitextParser;

describe('CategoryService', () => {
  let service;
  let mockApi;
  let mockMwApiEdit;

  beforeEach(() => {
    mockMwApiEdit = jest.fn();

    // Mock mw.Api globally for updateCategoriesOptimized tests
    global.mw = {
      Api: jest.fn().mockImplementation(() => ({
        edit: mockMwApiEdit
      }))
    };

    mockApi = {
      getPageContent: jest.fn(),
      editPage: jest.fn().mockResolvedValue({ edit: { result: 'Success' } })
    };
    service = new CategoryService(mockApi);
  });

  afterEach(() => {
    // Clean up global mw mock
    delete global.mw;
  });

  describe('addCategoriesToFile', () => {
    test('should add new category to page', async () => {
      mockApi.getPageContent.mockResolvedValue(
        'Some text\n[[Category:Existing]]'
      );

      const result = await service.addCategoriesToFile('File:Test.svg', ['Category:New']);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(true);
      expect(mockApi.editPage).toHaveBeenCalled();
    });

    test('should not edit if category already exists', async () => {
      mockApi.getPageContent.mockResolvedValue(
        'Some text\n[[Category:Existing]]'
      );

      const result = await service.addCategoriesToFile('File:Test.svg', ['Category:Existing']);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(false);
      expect(mockApi.editPage).not.toHaveBeenCalled();
    });
  });

  describe('removeCategoriesFromFile', () => {
    test('should remove existing category', async () => {
      mockApi.getPageContent.mockResolvedValue(
        'Some text\n[[Category:ToRemove]]\n[[Category:Keep]]'
      );

      const result = await service.removeCategoriesFromFile('File:Test.svg', ['Category:ToRemove']);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(true);
      expect(mockApi.editPage).toHaveBeenCalled();
    });

    test('should not edit if category does not exist', async () => {
      mockApi.getPageContent.mockResolvedValue(
        'Some text\n[[Category:Keep]]'
      );

      const result = await service.removeCategoriesFromFile('File:Test.svg', ['Category:NonExistent']);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(false);
      expect(mockApi.editPage).not.toHaveBeenCalled();
    });
  });

  describe('updateCategories', () => {
    test('should add and remove in single operation', async () => {
      mockApi.getPageContent.mockResolvedValue(
        'Some text\n[[Category:Old]]'
      );

      const result = await service.updateCategories(
        'File:Test.svg',
        ['Category:New'],
        ['Category:Old']
      );

      expect(result.success).toBe(true);
      expect(result.modified).toBe(true);
      expect(mockApi.editPage).toHaveBeenCalledTimes(1);
    });
  });

  describe('buildEditSummary', () => {
    test('should build summary with additions', () => {
      const summary = service.buildEditSummary(['Category:A'], []);
      expect(summary).toContain('Adding [[Category:A]]');
    });

    test('should build summary with removals', () => {
      const summary = service.buildEditSummary([], ['Category:B']);
      expect(summary).toContain('Removing [[Category:B]]');
    });

    test('should build summary with both', () => {
      const summary = service.buildEditSummary(['Category:A'], ['Category:B']);
      expect(summary).toContain('Adding [[Category:A]]');
      expect(summary).toContain('Removing [[Category:B]]');
    });
  });

  describe('getCurrentCategories', () => {
    test('should get categories for a file', async () => {
      mockApi.getCategories = jest.fn().mockResolvedValue(['Belarus', 'Europe', 'Maps']);

      const categories = await service.getCurrentCategories('File:Test.svg');

      expect(categories).toEqual(['Belarus', 'Europe', 'Maps']);
      expect(mockApi.getCategories).toHaveBeenCalledWith('File:Test.svg');
    });

    test('should return empty array if file not found', async () => {
      mockApi.getCategories = jest.fn().mockResolvedValue(false);

      const categories = await service.getCurrentCategories('File:NotFound.svg');

      expect(categories).toEqual([]);
    });
  });

  describe('updateCategoriesOptimized', () => {
    test('should add and remove categories using mw.Api.edit', async () => {
      mockMwApiEdit.mockResolvedValue({ edit: { result: 'Success' } });

      const result = await service.updateCategoriesOptimized(
        'File:Test.svg',
        ['Category:New1', 'Category:New2'],
        ['Category:Old1']
      );

      expect(result.success).toBe(true);
      expect(result.modified).toBe(true);
      expect(mockMwApiEdit).toHaveBeenCalledWith('File:Test.svg', expect.any(Function));
    });

    test('should handle no changes scenario', async () => {
      mockMwApiEdit.mockRejectedValue(new Error('no changes'));

      const result = await service.updateCategoriesOptimized(
        'File:Test.svg',
        [],
        []
      );

      expect(result.success).toBe(true);
      expect(result.modified).toBe(false);
    });

    test('should remove categories first then add new ones', async () => {
      let capturedTransformFn;
      mockMwApiEdit.mockImplementation((title, fn) => {
        capturedTransformFn = fn;
        return Promise.resolve({ edit: { result: 'Success' } });
      });

      await service.updateCategoriesOptimized(
        'File:Test.svg',
        ['Category:Add1'],
        ['Category:Remove1']
      );

      // Simulate the transform function
      const mockRevision = { content: '[[Category:Remove1]]\n[[Category:Keep]]' };
      const result = capturedTransformFn(mockRevision);

      expect(result.text).toContain('[[Category:Keep]]');
      expect(result.text).toContain('[[Category:Add1]]');
      expect(result.text).not.toContain('[[Category:Remove1]]');
    });

    test('should not add duplicate categories', async () => {
      let capturedTransformFn;
      mockMwApiEdit.mockImplementation((title, fn) => {
        capturedTransformFn = fn;
        return Promise.resolve({ edit: { result: 'Success' } });
      });

      await service.updateCategoriesOptimized(
        'File:Test.svg',
        ['Category:Existing'],
        []
      );

      const mockRevision = { content: '[[Category:Existing]]' };
      const result = capturedTransformFn(mockRevision);

      // Should return false since no changes needed
      expect(result).toBe(false);
    });

    test('should return false when no changes needed', async () => {
      let capturedTransformFn;
      mockMwApiEdit.mockImplementation((title, fn) => {
        capturedTransformFn = fn;
        return Promise.resolve({ edit: { result: 'Success' } });
      });

      await service.updateCategoriesOptimized(
        'File:Test.svg',
        ['Category:Existing'],
        []
      );

      const mockRevision = { content: '[[Category:Existing]]' };
      const result = capturedTransformFn(mockRevision);

      expect(result).toBe(false);
    });

    test('should build correct edit summary', async () => {
      let capturedTransformFn;
      mockMwApiEdit.mockImplementation((title, fn) => {
        capturedTransformFn = fn;
        return Promise.resolve({ edit: { result: 'Success' } });
      });

      await service.updateCategoriesOptimized(
        'File:Test.svg',
        ['Category:Add1', 'Category:Add2'],
        ['Category:Remove1']
      );

      const mockRevision = { content: 'Some content' };
      const result = capturedTransformFn(mockRevision);

      expect(result.summary).toContain('Adding [[Category:Add1]], [[Category:Add2]]');
      expect(result.summary).toContain('Removing [[Category:Remove1]]');
      expect(result.summary).toContain('(via Category Batch Manager)');
      expect(result.minor).toBe(false);
    });

    test('should build edit summary with only additions', async () => {
      let capturedTransformFn;
      mockMwApiEdit.mockImplementation((title, fn) => {
        capturedTransformFn = fn;
        return Promise.resolve({ edit: { result: 'Success' } });
      });

      await service.updateCategoriesOptimized(
        'File:Test.svg',
        ['Category:Add1'],
        []
      );

      const mockRevision = { content: 'Some content' };
      const result = capturedTransformFn(mockRevision);

      expect(result.summary).toContain('Adding [[Category:Add1]]');
      expect(result.summary).not.toContain('-');
    });

    test('should build edit summary with only removals', async () => {
      let capturedTransformFn;
      mockMwApiEdit.mockImplementation((title, fn) => {
        capturedTransformFn = fn;
        return Promise.resolve({ edit: { result: 'Success' } });
      });

      await service.updateCategoriesOptimized(
        'File:Test.svg',
        [],
        ['Category:Remove1']
      );

      const mockRevision = { content: '[[Category:Remove1]]' };
      const result = capturedTransformFn(mockRevision);

      expect(result.summary).toContain('Removing [[Category:Remove1]]');
      expect(result.summary).not.toContain('+');
    });

    test('should throw error for non-no-changes errors', async () => {
      const error = new Error('Edit conflict');
      mockMwApiEdit.mockRejectedValue(error);

      await expect(
        service.updateCategoriesOptimized('File:Test.svg', ['Cat'], [])
      ).rejects.toThrow('Edit conflict');
    });

    test('should handle error without message property', async () => {
      const error = { someProperty: 'value' };
      mockMwApiEdit.mockRejectedValue(error);

      await expect(
        service.updateCategoriesOptimized('File:Test.svg', ['Cat'], [])
      ).rejects.toEqual(error);
    });
  });
});
