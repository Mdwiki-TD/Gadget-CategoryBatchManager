const ValidationHelper = require('../../../../src/ui/helpers/ValidationHelper');

// Mock Validator
global.Validator = {
  normalizeCategoryName: (categoryName) => {
    if (!categoryName || typeof categoryName !== 'string') return '';
    return categoryName
      .replace(/^Category:/i, '')
      .replace(/_/g, ' ')
      .trim();
  },
  isCircularCategory: () => false
};

describe('ValidationHelper', () => {
  let validationHelper;

  beforeEach(() => {
    validationHelper = new ValidationHelper();
  });

  describe('hasDuplicateCategories', () => {
    test('should return valid when add list is empty', () => {
      const self = {
        addCategory: { selected: [] },
        removeCategory: { selected: ['Category:A'] }
      };

      const result = validationHelper.hasDuplicateCategories(self);

      expect(result.valid).toBe(true);
      expect(result.duplicates).toBeUndefined();
    });

    test('should return valid when remove list is empty', () => {
      const self = {
        addCategory: { selected: ['Category:A'] },
        removeCategory: { selected: [] }
      };

      const result = validationHelper.hasDuplicateCategories(self);

      expect(result.valid).toBe(true);
      expect(result.duplicates).toBeUndefined();
    });

    test('should return valid when both lists are empty', () => {
      const self = {
        addCategory: { selected: [] },
        removeCategory: { selected: [] }
      };

      const result = validationHelper.hasDuplicateCategories(self);

      expect(result.valid).toBe(true);
      expect(result.duplicates).toBeUndefined();
    });

    test('should detect exact duplicate in add and remove lists', () => {
      const self = {
        addCategory: { selected: ['Category:Test'] },
        removeCategory: { selected: ['Category:Test'] }
      };

      const result = validationHelper.hasDuplicateCategories(self);

      expect(result.valid).toBe(false);
      expect(result.duplicates).toEqual(['Category:Test']);
    });

    test('should detect duplicate with underscores vs spaces', () => {
      const self = {
        addCategory: { selected: ['Category:Test_Category'] },
        removeCategory: { selected: ['Category:Test Category'] }
      };

      const result = validationHelper.hasDuplicateCategories(self);

      expect(result.valid).toBe(false);
      expect(result.duplicates).toEqual(['Category:Test_Category']);
    });

    test('should detect duplicate with case insensitivity', () => {
      const self = {
        addCategory: { selected: ['Category:test'] },
        removeCategory: { selected: ['Category:TEST'] }
      };

      const result = validationHelper.hasDuplicateCategories(self);

      expect(result.valid).toBe(false);
      expect(result.duplicates).toEqual(['Category:test']);
    });

    test('should detect duplicate without Category prefix', () => {
      const self = {
        addCategory: { selected: ['Test'] },
        removeCategory: { selected: ['Category:Test'] }
      };

      const result = validationHelper.hasDuplicateCategories(self);

      expect(result.valid).toBe(false);
      expect(result.duplicates).toEqual(['Test']);
    });

    test('should detect multiple duplicates', () => {
      const self = {
        addCategory: { selected: ['Category:A', 'Category:B', 'Category:C'] },
        removeCategory: { selected: ['Category:X', 'Category:B', 'Category:A'] }
      };

      const result = validationHelper.hasDuplicateCategories(self);

      expect(result.valid).toBe(false);
      expect(result.duplicates).toEqual(['Category:A', 'Category:B']);
    });

    test('should return valid when no duplicates exist', () => {
      const self = {
        addCategory: { selected: ['Category:A', 'Category:B'] },
        removeCategory: { selected: ['Category:C', 'Category:D'] }
      };

      const result = validationHelper.hasDuplicateCategories(self);

      expect(result.valid).toBe(true);
      expect(result.duplicates).toBeUndefined();
    });

    test('should handle undefined selected arrays', () => {
      const self = {
        addCategory: { selected: undefined },
        removeCategory: { selected: undefined }
      };

      const result = validationHelper.hasDuplicateCategories(self);

      expect(result.valid).toBe(true);
    });

    test('should handle missing selected property', () => {
      const self = {
        addCategory: {},
        removeCategory: {}
      };

      const result = validationHelper.hasDuplicateCategories(self);

      expect(result.valid).toBe(true);
    });
  });

  describe('filterCircularCategories', () => {
    test('should filter out circular categories', () => {
      // Mock isCircularCategory to return true for some categories
      global.Validator.isCircularCategory = (current, toAdd) => {
        return toAdd === 'Category:Circular';
      };

      const addCategories = ['Category:Valid', 'Category:Circular'];
      const sourceCategory = 'Category:Source';

      const result = validationHelper.filterCircularCategories(addCategories, sourceCategory);

      expect(result.validCategories).toEqual(['Category:Valid']);
      expect(result.circularCategories).toEqual(['Category:Circular']);
    });

    test('should return all as circular if all are circular', () => {
      global.Validator.isCircularCategory = () => true;

      const addCategories = ['Category:Circular1', 'Category:Circular2'];
      const sourceCategory = 'Category:Source';

      const result = validationHelper.filterCircularCategories(addCategories, sourceCategory);

      expect(result.validCategories).toEqual([]);
      expect(result.circularCategories).toEqual(['Category:Circular1', 'Category:Circular2']);
    });

    test('should return all categories if none are circular', () => {
      global.Validator.isCircularCategory = () => false;

      const addCategories = ['Category:A', 'Category:B'];
      const sourceCategory = 'Category:Source';

      const result = validationHelper.filterCircularCategories(addCategories, sourceCategory);

      expect(result.validCategories).toEqual(['Category:A', 'Category:B']);
      expect(result.circularCategories).toEqual([]);
    });
  });
});
