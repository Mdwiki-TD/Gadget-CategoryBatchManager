const { default: ChangeCalculator } = require('../../src/utils/ChangeCalculator');

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

describe('ChangeCalculator', () => {
  describe('findCategoryIndex', () => {
    test('should find category by exact match', () => {
      const categories = ['Category:A', 'Category:B', 'Category:C'];
      const result = ChangeCalculator.findCategoryIndex('Category:A', categories);
      expect(result).toBe(0);
    });

    test('should find category with underscores', () => {
      const categories = ['Category:Test Category', 'Category:B'];
      const result = ChangeCalculator.findCategoryIndex('Category:Test_Category', categories);
      expect(result).toBe(0);
    });

    test('should find category without prefix', () => {
      const categories = ['Category:A', 'Category:B'];
      const result = ChangeCalculator.findCategoryIndex('A', categories);
      expect(result).toBe(0);
    });

    test('should return -1 for non-existent category', () => {
      const categories = ['Category:A', 'Category:B'];
      const result = ChangeCalculator.findCategoryIndex('Category:C', categories);
      expect(result).toBe(-1);
    });

    test('should be case insensitive', () => {
      const categories = ['Category:Test Category'];
      const result = ChangeCalculator.findCategoryIndex('category:test_category', categories);
      expect(result).toBe(0);
    });
  });

  describe('categoryExists', () => {
    test('should return true for existing category', () => {
      const categories = ['Category:A', 'Category:B'];
      const result = ChangeCalculator.categoryExists('Category:A', categories);
      expect(result).toBe(true);
    });

    test('should return false for non-existent category', () => {
      const categories = ['Category:A', 'Category:B'];
      const result = ChangeCalculator.categoryExists('Category:C', categories);
      expect(result).toBe(false);
    });
  });

  describe('calculateFileChanges', () => {
    test('should detect willChange when adding category', () => {
      const file = { title: 'File:Test.svg', currentCategories: ['Category:A'] };
      const result = ChangeCalculator.calculateFileChanges(file, ['Category:B'], []);

      expect(result.willChange).toBe(true);
      expect(result.newCategories).toContain('Category:B');
      expect(result.newCategories).toContain('Category:A');
    });

    test('should detect willChange when removing category', () => {
      const file = { title: 'File:Test.svg', currentCategories: ['Category:A', 'Category:B'] };
      const result = ChangeCalculator.calculateFileChanges(file, [], ['Category:A']);

      expect(result.willChange).toBe(true);
      expect(result.newCategories).toEqual(['Category:B']);
    });

    test('should detect willChange=false when no changes', () => {
      const file = { title: 'File:Test.svg', currentCategories: ['Category:A'] };
      const result = ChangeCalculator.calculateFileChanges(file, [], []);

      expect(result.willChange).toBe(false);
      expect(result.newCategories).toEqual(['Category:A']);
    });

    test('should handle files without currentCategories', () => {
      const file = { title: 'File:Test.svg' };
      const result = ChangeCalculator.calculateFileChanges(file, ['Category:A'], []);

      expect(result.willChange).toBe(true);
      expect(result.newCategories).toEqual(['Category:A']);
    });

    test('should detect willChange=false when removing non-existent category', () => {
      const file = { title: 'File:Test.svg', currentCategories: ['Category:A'] };
      const result = ChangeCalculator.calculateFileChanges(file, [], ['Category:B']);

      expect(result.willChange).toBe(false);
      expect(result.newCategories).toEqual(['Category:A']);
    });

    test('should not add duplicate categories', () => {
      const file = { title: 'File:Test.svg', currentCategories: ['Category:A'] };
      const result = ChangeCalculator.calculateFileChanges(file, ['Category:A'], []);

      expect(result.willChange).toBe(false);
      expect(result.newCategories).toEqual(['Category:A']);
    });

    test('should handle combined add and remove', () => {
      const file = { title: 'File:Test.svg', currentCategories: ['Category:Old'] };
      const result = ChangeCalculator.calculateFileChanges(file, ['Category:New'], ['Category:Old']);

      expect(result.willChange).toBe(true);
      expect(result.newCategories).toEqual(['Category:New']);
    });
  });

  describe('previewChanges', () => {
    test('should return empty array for empty files', () => {
      const result = ChangeCalculator.previewChanges([], ['Category:A'], []);
      expect(result).toEqual([]);
    });

    test('should calculate changes for multiple files', () => {
      const files = [
        { title: 'File:Test1.svg', currentCategories: ['Category:A'] },
        { title: 'File:Test2.svg', currentCategories: ['Category:B'] }
      ];
      const result = ChangeCalculator.previewChanges(files, ['Category:C'], []);

      expect(result).toHaveLength(2);
      expect(result[0].willChange).toBe(true);
      expect(result[0].newCategories).toContain('Category:C');
      expect(result[1].willChange).toBe(true);
      expect(result[1].newCategories).toContain('Category:C');
    });

    test('should handle files with different change states', () => {
      const files = [
        { title: 'File:WillChange.svg', currentCategories: ['Category:A'] },
        { title: 'File:WontChange.svg', currentCategories: ['Category:B'] }
      ];
      const result = ChangeCalculator.previewChanges(files, ['Category:B'], []);

      expect(result).toHaveLength(2);
      expect(result[0].willChange).toBe(true);  // Will add B to A
      expect(result[1].willChange).toBe(false); // B already exists
    });
  });

  describe('previewChanges', () => {
    test('should show files that will change', async () => {
      const files = [
        { title: 'File:Test.svg', currentCategories: ['Category:A'] }
      ];

      const result = ChangeCalculator.previewChanges(
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

      const result = ChangeCalculator.previewChanges(
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

      const result = ChangeCalculator.previewChanges(
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

      const result = ChangeCalculator.previewChanges(
        files,
        ['Category:New'],
        ['Category:Old']
      );

      expect(result).toHaveLength(1);
      expect(result[0].willChange).toBe(true);
      expect(result[0].newCategories).toEqual(['Category:New']);
    });

    test('should handle empty files array', async () => {
      const result = ChangeCalculator.previewChanges([], ['Category:A'], []);
      expect(result).toEqual([]);
    });

    test('should handle files without currentCategories', async () => {
      const files = [
        { title: 'File:Test.svg' }
      ];

      const result = ChangeCalculator.previewChanges(
        files,
        ['Category:A'],
        []
      );

      expect(result).toHaveLength(1);
      expect(result[0].willChange).toBe(true);
      expect(result[0].newCategories).toEqual(['Category:A']);
    });

    test('should allow removing duplicate categories', async () => {
      const files = [
        { title: 'File:Test.svg', currentCategories: ['Category:A', 'Category:B'] }
      ];

      const result = ChangeCalculator.previewChanges(
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

      const result = ChangeCalculator.previewChanges(
        files,
        ['Category:B'],
        ['Category:A']
      );

      expect(result).toHaveLength(1);
      expect(result[0].willChange).toBe(true);
      expect(result[0].newCategories).toEqual(['Category:B']);
    });
  });

  describe('filterFilesThatWillChange', () => {
    test('should return only files that will change', () => {
      const files = [
        { title: 'File:Change1.svg', currentCategories: ['Category:A'] },
        { title: 'File:NoChange.svg', currentCategories: ['Category:B'] },
        { title: 'File:Change2.svg', currentCategories: ['Category:C'] }
      ];
      const result = ChangeCalculator.filterFilesThatWillChange(files, ['Category:B'], []);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('File:Change1.svg');
      expect(result[1].title).toBe('File:Change2.svg');
    });

    test('should return empty array when no files will change', () => {
      const files = [
        { title: 'File:Test1.svg', currentCategories: ['Category:A'] },
        { title: 'File:Test2.svg', currentCategories: ['Category:A'] }
      ];
      const result = ChangeCalculator.filterFilesThatWillChange(files, ['Category:A'], []);

      expect(result).toEqual([]);
    });
  });

  describe('countFilesThatWillChange', () => {
    test('should count files that will change', () => {
      const files = [
        { title: 'File:Change1.svg', currentCategories: ['Category:A'] },
        { title: 'File:NoChange.svg', currentCategories: ['Category:B'] },
        { title: 'File:Change2.svg', currentCategories: ['Category:C'] }
      ];
      const count = ChangeCalculator.countFilesThatWillChange(files, ['Category:B'], []);

      expect(count).toBe(2);
    });

    test('should return 0 when no files will change', () => {
      const files = [
        { title: 'File:Test1.svg', currentCategories: ['Category:A'] },
        { title: 'File:Test2.svg', currentCategories: ['Category:A'] }
      ];
      const count = ChangeCalculator.countFilesThatWillChange(files, ['Category:A'], []);

      expect(count).toBe(0);
    });

    test('should return 0 for empty files array', () => {
      const count = ChangeCalculator.countFilesThatWillChange([], ['Category:A'], []);
      expect(count).toBe(0);
    });
  });
});
