const PreviewHandler = require('../../../../src/ui/handlers/PreviewHandler');

// Mock RateLimiter
global.RateLimiter = class {
  async wait() { return Promise.resolve(); }
};

// Mock Validator
global.Validator = {
  normalizeCategoryName: (categoryName) => {
    if (!categoryName || typeof categoryName !== 'string') return '';
    return categoryName
      .replace(/^Category:/i, '')
      .replace(/_/g, ' ')
      .trim();
  }
};

describe('PreviewHandler', () => {
  let processor;
  let mockValidationHelper;

  beforeEach(() => {
    mockValidationHelper = {
      updateCategories: jest.fn().mockResolvedValue({ success: true, modified: true })
    };
    processor = new PreviewHandler(mockValidationHelper);
  });

  describe('previewChanges', () => {
    test('should show files that will change', async () => {
      const files = [
        { title: 'File:Test.svg', currentCategories: ['Category:A'] }
      ];

      const result = await processor.previewChanges(
        files,
        ['Category:B'],
        []
      );

      expect(result).toHaveLength(1);
      expect(result[0].willChange).toBe(true);
      expect(result[0].newCategories).toContain('Category:B');
      expect(result[0].newCategories).toContain('Category:A');
    }); test('should show files that will not change when only removing non-existent categories', async () => {
      const files = [
        { title: 'File:Test.svg', currentCategories: ['Category:A'] }
      ];

      const result = await processor.previewChanges(
        files,
        [],
        ['Category:B']
      );

      expect(result).toHaveLength(1);
      expect(result[0].willChange).toBe(false);
    });

    test('should handle removal preview', async () => {
      const files = [
        { title: 'File:Test.svg', currentCategories: ['Category:A', 'Category:B'] }
      ];

      const result = await processor.previewChanges(
        files,
        [],
        ['Category:A']
      );

      expect(result).toHaveLength(1);
      expect(result[0].willChange).toBe(true);
      expect(result[0].newCategories).toEqual(['Category:B']);
    });

    test('should handle combined add and remove', async () => {
      const files = [
        { title: 'File:Test.svg', currentCategories: ['Category:Old'] }
      ];

      const result = await processor.previewChanges(
        files,
        ['Category:New'],
        ['Category:Old']
      );

      expect(result).toHaveLength(1);
      expect(result[0].willChange).toBe(true);
      expect(result[0].newCategories).toEqual(['Category:New']);
    });

    test('should handle empty files array', async () => {
      const result = await processor.previewChanges([], ['Category:A'], []);
      expect(result).toEqual([]);
    });

    test('should handle files without currentCategories', async () => {
      const files = [
        { title: 'File:Test.svg' }
      ];

      const result = await processor.previewChanges(
        files,
        ['Category:A'],
        []
      );

      expect(result).toHaveLength(1);
      expect(result[0].willChange).toBe(true);
      expect(result[0].newCategories).toEqual(['Category:A']);
    });

    test('should throw error when trying to add duplicate categories', async () => {
      const files = [
        { title: 'File:Test.svg', currentCategories: ['Category:A', 'Category:B'] }
      ];

      await expect(
        processor.previewChanges(files, ['Category:A'], [])
      ).rejects.toThrow('The following categories already exist and cannot be added: Category:A');
    });

    test('should throw error for multiple duplicate categories', async () => {
      const files = [
        { title: 'File:Test.svg', currentCategories: ['Category:A', 'Category:B', 'Category:C'] }
      ];

      await expect(
        processor.previewChanges(files, ['Category:A', 'Category:B'], [])
      ).rejects.toThrow('The following categories already exist and cannot be added: Category:A, Category:B');
    });

    test('should allow removing duplicate categories', async () => {
      const files = [
        { title: 'File:Test.svg', currentCategories: ['Category:A', 'Category:B'] }
      ];

      const result = await processor.previewChanges(
        files,
        [],
        ['Category:A']
      );

      expect(result).toHaveLength(1);
      expect(result[0].willChange).toBe(true);
      expect(result[0].newCategories).toEqual(['Category:B']);
    });

    test('should allow adding and removing different categories', async () => {
      const files = [
        { title: 'File:Test.svg', currentCategories: ['Category:A'] }
      ];

      const result = await processor.previewChanges(
        files,
        ['Category:B'],
        ['Category:A']
      );

      expect(result).toHaveLength(1);
      expect(result[0].willChange).toBe(true);
      expect(result[0].newCategories).toEqual(['Category:B']);
    });
  });

});
