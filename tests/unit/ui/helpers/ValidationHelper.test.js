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
      const vueInstance = {
        addCategory: { selected: [] },
        removeCategory: { selected: ['Category:A'] }
      };

      const result = validationHelper.hasDuplicateCategories(vueInstance);

      expect(result.valid).toBe(true);
      expect(result.duplicates).toBeUndefined();
    });

    test('should return valid when remove list is empty', () => {
      const vueInstance = {
        addCategory: { selected: ['Category:A'] },
        removeCategory: { selected: [] }
      };

      const result = validationHelper.hasDuplicateCategories(vueInstance);

      expect(result.valid).toBe(true);
      expect(result.duplicates).toBeUndefined();
    });

    test('should return valid when both lists are empty', () => {
      const vueInstance = {
        addCategory: { selected: [] },
        removeCategory: { selected: [] }
      };

      const result = validationHelper.hasDuplicateCategories(vueInstance);

      expect(result.valid).toBe(true);
      expect(result.duplicates).toBeUndefined();
    });

    test('should detect exact duplicate in add and remove lists', () => {
      const vueInstance = {
        addCategory: { selected: ['Category:Test'] },
        removeCategory: { selected: ['Category:Test'] }
      };

      const result = validationHelper.hasDuplicateCategories(vueInstance);

      expect(result.valid).toBe(false);
      expect(result.duplicates).toEqual(['Category:Test']);
    });

    test('should detect duplicate with underscores vs spaces', () => {
      const vueInstance = {
        addCategory: { selected: ['Category:Test_Category'] },
        removeCategory: { selected: ['Category:Test Category'] }
      };

      const result = validationHelper.hasDuplicateCategories(vueInstance);

      expect(result.valid).toBe(false);
      expect(result.duplicates).toEqual(['Category:Test_Category']);
    });

    test('should detect duplicate with case insensitivity', () => {
      const vueInstance = {
        addCategory: { selected: ['Category:test'] },
        removeCategory: { selected: ['Category:TEST'] }
      };

      const result = validationHelper.hasDuplicateCategories(vueInstance);

      expect(result.valid).toBe(false);
      expect(result.duplicates).toEqual(['Category:test']);
    });

    test('should detect duplicate without Category prefix', () => {
      const vueInstance = {
        addCategory: { selected: ['Test'] },
        removeCategory: { selected: ['Category:Test'] }
      };

      const result = validationHelper.hasDuplicateCategories(vueInstance);

      expect(result.valid).toBe(false);
      expect(result.duplicates).toEqual(['Test']);
    });

    test('should detect multiple duplicates', () => {
      const vueInstance = {
        addCategory: { selected: ['Category:A', 'Category:B', 'Category:C'] },
        removeCategory: { selected: ['Category:X', 'Category:B', 'Category:A'] }
      };

      const result = validationHelper.hasDuplicateCategories(vueInstance);

      expect(result.valid).toBe(false);
      expect(result.duplicates).toEqual(['Category:A', 'Category:B']);
    });

    test('should return valid when no duplicates exist', () => {
      const vueInstance = {
        addCategory: { selected: ['Category:A', 'Category:B'] },
        removeCategory: { selected: ['Category:C', 'Category:D'] }
      };

      const result = validationHelper.hasDuplicateCategories(vueInstance);

      expect(result.valid).toBe(true);
      expect(result.duplicates).toBeUndefined();
    });

    test('should handle undefined selected arrays', () => {
      const vueInstance = {
        addCategory: { selected: undefined },
        removeCategory: { selected: undefined }
      };

      const result = validationHelper.hasDuplicateCategories(vueInstance);

      expect(result.valid).toBe(true);
    });

    test('should handle missing selected property', () => {
      const vueInstance = {
        addCategory: {},
        removeCategory: {}
      };

      const result = validationHelper.hasDuplicateCategories(vueInstance);

      expect(result.valid).toBe(true);
    });
  });

  describe('filterCircularCategories', () => {
    test('should filter out circular categories', () => {
      // Mock isCircularCategory to return true for some categories
      global.Validator.isCircularCategory = (current, toAdd) => {
        return toAdd === 'Category:Circular';
      };

      const vueInstance = {
        sourceCategory: 'Category:Source',
        addCategory: { selected: ['Category:Valid', 'Category:Circular'] },
        displayCategoryMessage: jest.fn()
      };

      const result = validationHelper.filterCircularCategories(vueInstance);

      expect(result).toEqual(['Category:Valid']);
    });

    test('should return null if all categories are circular', () => {
      global.Validator.isCircularCategory = () => true;

      const vueInstance = {
        sourceCategory: 'Category:Source',
        addCategory: { selected: ['Category:Circular1', 'Category:Circular2'] },
        displayCategoryMessage: jest.fn()
      };

      const result = validationHelper.filterCircularCategories(vueInstance);

      expect(result).toBeNull();
      expect(vueInstance.displayCategoryMessage).toHaveBeenCalled();
    });

    test('should return all categories if none are circular', () => {
      global.Validator.isCircularCategory = () => false;

      const vueInstance = {
        sourceCategory: 'Category:Source',
        addCategory: { selected: ['Category:A', 'Category:B'] },
        displayCategoryMessage: jest.fn()
      };

      const result = validationHelper.filterCircularCategories(vueInstance);

      expect(result).toEqual(['Category:A', 'Category:B']);
    });
  });
});
