const CategoryService = require('../../../src/services/CategoryService');
const WikitextParser = require('../../../src/utils/WikitextParser');

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
      expect(summary).toContain('+Category:A');
    });

    test('should build summary with removals', () => {
      const summary = service.buildEditSummary([], ['Category:B']);
      expect(summary).toContain('-Category:B');
    });

    test('should build summary with both', () => {
      const summary = service.buildEditSummary(['Category:A'], ['Category:B']);
      expect(summary).toContain('+Category:A');
      expect(summary).toContain('-Category:B');
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
  });
});
