const { default: Validator } = require('../../src/utils/Validator');

describe('Validator', () => {
  describe('isValidCategoryName', () => {
    test('should accept valid category name', () => {
      expect(Validator.isValidCategoryName('Category:Test')).toBe(true);
    });

    test('should accept name without prefix', () => {
      expect(Validator.isValidCategoryName('Test Category')).toBe(true);
    });

    test('should reject empty string', () => {
      expect(Validator.isValidCategoryName('')).toBe(false);
    });

    test('should reject null', () => {
      expect(Validator.isValidCategoryName(null)).toBe(false);
    });

    test('should reject undefined', () => {
      expect(Validator.isValidCategoryName(undefined)).toBe(false);
    });

    test('should reject names with invalid characters', () => {
      expect(Validator.isValidCategoryName('Test#Name')).toBe(false);
      expect(Validator.isValidCategoryName('Test<Name')).toBe(false);
      expect(Validator.isValidCategoryName('Test>Name')).toBe(false);
      expect(Validator.isValidCategoryName('Test[Name')).toBe(false);
      expect(Validator.isValidCategoryName('Test]Name')).toBe(false);
      expect(Validator.isValidCategoryName('Test{Name')).toBe(false);
      expect(Validator.isValidCategoryName('Test}Name')).toBe(false);
      expect(Validator.isValidCategoryName('Test|Name')).toBe(false);
    });

    test('should reject whitespace-only', () => {
      expect(Validator.isValidCategoryName('   ')).toBe(false);
    });

    test('should reject Category: prefix only', () => {
      expect(Validator.isValidCategoryName('Category:')).toBe(false);
    });
  });

  describe('isValidSearchPattern', () => {
    test('should accept valid pattern', () => {
      expect(Validator.isValidSearchPattern(',BLR.svg')).toBe(true);
    });

    test('should reject empty string', () => {
      expect(Validator.isValidSearchPattern('')).toBe(false);
    });

    test('should reject null', () => {
      expect(Validator.isValidSearchPattern(null)).toBe(false);
    });

    test('should reject undefined', () => {
      expect(Validator.isValidSearchPattern(undefined)).toBe(false);
    });

    test('should reject whitespace-only', () => {
      expect(Validator.isValidSearchPattern('   ')).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    test('should trim whitespace', () => {
      expect(Validator.sanitizeInput('  hello  ')).toBe('hello');
    });

    test('should return empty string for null', () => {
      expect(Validator.sanitizeInput(null)).toBe('');
    });

    test('should return empty string for undefined', () => {
      expect(Validator.sanitizeInput(undefined)).toBe('');
    });

    test('should return empty string for non-string', () => {
      expect(Validator.sanitizeInput(123)).toBe('');
    });

    test('should handle empty string', () => {
      expect(Validator.sanitizeInput('')).toBe('');
    });
  });

  describe('sanitizeTitlePattern', () => {
    test('should trim whitespace', () => {
      expect(Validator.sanitizeTitlePattern('  hello  ')).toBe('hello');
    });

    test('should escape backslashes', () => {
      expect(Validator.sanitizeTitlePattern('test\\pattern')).toBe('test\\\\pattern');
    });

    test('should escape double quotes', () => {
      expect(Validator.sanitizeTitlePattern('test"pattern')).toBe('test\\"pattern');
    });

    test('should escape single quotes', () => {
      expect(Validator.sanitizeTitlePattern("test'pattern")).toBe("test\\'pattern");
    });

    test('should escape multiple special characters', () => {
      expect(Validator.sanitizeTitlePattern('test\\"pattern\\')).toBe('test\\\\\\"pattern\\\\');
    });

    test('should escape backslashes first', () => {
      // This test ensures backslashes are escaped before quotes
      const result = Validator.sanitizeTitlePattern('\\test');
      expect(result).toBe('\\\\test');
    });

    test('should return empty string for null', () => {
      expect(Validator.sanitizeTitlePattern(null)).toBe('');
    });

    test('should return empty string for undefined', () => {
      expect(Validator.sanitizeTitlePattern(undefined)).toBe('');
    });

    test('should return empty string for non-string', () => {
      expect(Validator.sanitizeTitlePattern(123)).toBe('');
    });

    test('should handle empty string', () => {
      expect(Validator.sanitizeTitlePattern('')).toBe('');
    });

    test('should limit input length to 200 characters', () => {
      const longPattern = 'a'.repeat(250);
      const result = Validator.sanitizeTitlePattern(longPattern);
      expect(result.length).toBe(200);
    });

    test('should handle pattern with common search characters', () => {
      expect(Validator.sanitizeTitlePattern(',BLR')).toBe(',BLR');
      expect(Validator.sanitizeTitlePattern('^Chart')).toBe('^Chart');
      expect(Validator.sanitizeTitlePattern('Test*')).toBe('Test*');
    });

    test('should handle mixed special characters', () => {
      const result = Validator.sanitizeTitlePattern("test's \"pattern\"");
      // Expected: test\'s \"pattern\" - escaped single and double quotes
      expect(result).toContain('\\');
      expect(result).toContain('test');
      expect(result).toContain('s');
      expect(result).toContain('pattern');
    });

    test('should preserve regex patterns', () => {
      expect(Validator.sanitizeTitlePattern('^[A-Z]')).toBe('^[A-Z]');
      expect(Validator.sanitizeTitlePattern('[0-9]+')).toBe('[0-9]+');
    });

    test('should trim before processing', () => {
      const result = Validator.sanitizeTitlePattern('  test  ');
      expect(result).toBe('test');
    });

    test('should handle very long input after trim', () => {
      const longPattern = '  ' + 'a'.repeat(250) + '  ';
      const result = Validator.sanitizeTitlePattern(longPattern);
      expect(result.length).toBeLessThanOrEqual(200);
    });
  });

  describe('normalizeCategoryName', () => {
    test('should remove Category: prefix', () => {
      expect(Validator.normalizeCategoryName('Category:Test')).toBe('Test');
    });

    test('should convert underscores to spaces', () => {
      expect(Validator.normalizeCategoryName('Test_Category')).toBe('Test Category');
    });

    test('should handle both prefix and underscores', () => {
      expect(Validator.normalizeCategoryName('Category:Test_Category')).toBe('Test Category');
    });

    test('should trim whitespace', () => {
      expect(Validator.normalizeCategoryName('  Test Category  ')).toBe('Test Category');
    });

    test('should handle empty input', () => {
      expect(Validator.normalizeCategoryName('')).toBe('');
      expect(Validator.normalizeCategoryName(null)).toBe('');
      expect(Validator.normalizeCategoryName(undefined)).toBe('');
    });
  });

  describe('isCircularCategory', () => {
    test('should detect exact match', () => {
      expect(Validator.isCircularCategory('Test', 'Test')).toBe(true);
    });

    test('should detect match with underscores vs spaces', () => {
      expect(Validator.isCircularCategory('Our_World_in_Data_graphs_of_Afghanistan', 'Our World in Data graphs of Afghanistan')).toBe(true);
    });

    test('should detect match with Category: prefix', () => {
      expect(Validator.isCircularCategory('Category:Test', 'Test')).toBe(true);
      expect(Validator.isCircularCategory('Test', 'Category:Test')).toBe(true);
      expect(Validator.isCircularCategory('Category:Test', 'Category:Test')).toBe(true);
    });

    test('should detect match with mixed formats', () => {
      expect(Validator.isCircularCategory('Category:Our_World_in_Data_graphs_of_Afghanistan', 'Our World in Data graphs of Afghanistan')).toBe(true);
      expect(Validator.isCircularCategory('Our World in Data graphs of Afghanistan', 'Category:Our_World_in_Data_graphs_of_Afghanistan')).toBe(true);
    });

    test('should be case-insensitive', () => {
      expect(Validator.isCircularCategory('TEST', 'test')).toBe(true);
      expect(Validator.isCircularCategory('Test Category', 'test_category')).toBe(true);
    });

    test('should return false for different categories', () => {
      expect(Validator.isCircularCategory('Category A', 'Category B')).toBe(false);
      expect(Validator.isCircularCategory('Test', 'Another Test')).toBe(false);
    });

    test('should handle empty input', () => {
      expect(Validator.isCircularCategory('', '')).toBe(false);
      expect(Validator.isCircularCategory('Test', '')).toBe(false);
      expect(Validator.isCircularCategory('', 'Test')).toBe(false);
      expect(Validator.isCircularCategory(null, 'Test')).toBe(false);
      expect(Validator.isCircularCategory('Test', null)).toBe(false);
    });
  });
});
