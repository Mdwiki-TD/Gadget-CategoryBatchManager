const { default: WikitextParser } = require('../../../src/utils/WikitextParser');

describe('WikitextParser', () => {
  let parser;

  beforeEach(() => {
    parser = new WikitextParser();
  });

  describe('extractCategories', () => {
    test('should extract single category', () => {
      const wikitext = 'Some text [[Category:Test]] more text';
      const result = parser.extractCategories(wikitext);
      expect(result).toEqual(['Category:Test']);
    });

    test('should extract multiple categories', () => {
      const wikitext = '[[Category:A]] text [[Category:B]]';
      const result = parser.extractCategories(wikitext);
      expect(result).toEqual(['Category:A', 'Category:B']);
    });

    test('should handle categories with sort keys', () => {
      const wikitext = '[[Category:Test|Sort Key]]';
      const result = parser.extractCategories(wikitext);
      expect(result).toEqual(['Category:Test']);
    });

    test('should return empty array for no categories', () => {
      const wikitext = 'Some text without categories';
      const result = parser.extractCategories(wikitext);
      expect(result).toEqual([]);
    });

    test('should handle empty wikitext', () => {
      const result = parser.extractCategories('');
      expect(result).toEqual([]);
    });

    test('should trim category names', () => {
      const wikitext = '[[Category: Spaces ]]';
      const result = parser.extractCategories(wikitext);
      expect(result).toEqual(['Category:Spaces']);
    });
  });

  describe('hasCategory', () => {
    test('should return true when category exists', () => {
      const wikitext = '[[Category:Test]]';
      expect(parser.hasCategory(wikitext, 'Category:Test')).toBe(true);
    });

    test('should return true without Category: prefix', () => {
      const wikitext = '[[Category:Test]]';
      expect(parser.hasCategory(wikitext, 'Test')).toBe(true);
    });

    test('should be case-insensitive', () => {
      const wikitext = '[[Category:Test]]';
      expect(parser.hasCategory(wikitext, 'Category:test')).toBe(true);
    });

    test('should return false when category does not exist', () => {
      const wikitext = '[[Category:Other]]';
      expect(parser.hasCategory(wikitext, 'Category:Test')).toBe(false);
    });

    test('should handle category with sort key', () => {
      const wikitext = '[[Category:Test|SortKey]]';
      expect(parser.hasCategory(wikitext, 'Category:Test')).toBe(true);
    });

    test('should handle special regex characters in category name', () => {
      const wikitext = '[[Category:Test (thing)]]';
      expect(parser.hasCategory(wikitext, 'Category:Test (thing)')).toBe(true);
    });
  });

  describe('addCategory', () => {
    test('should add category after last existing category', () => {
      const wikitext = 'Text\n[[Category:A]]';
      const result = parser.addCategory(wikitext, 'Category:B');
      expect(result).toContain('[[Category:A]]');
      expect(result).toContain('[[Category:B]]');
    });

    test('should add category at end when no existing categories', () => {
      const wikitext = 'Some text without categories';
      const result = parser.addCategory(wikitext, 'Category:New');
      expect(result).toContain('[[Category:New]]');
    });

    test('should handle Category: prefix stripping', () => {
      const wikitext = 'Text\n[[Category:A]]';
      const result = parser.addCategory(wikitext, 'Category:B');
      expect(result).toContain('[[Category:B]]');
      expect(result).not.toContain('[[Category:Category:B]]');
    });

    test('should handle name without Category: prefix', () => {
      const wikitext = 'Text\n[[Category:A]]';
      const result = parser.addCategory(wikitext, 'B');
      expect(result).toContain('[[Category:B]]');
    });
  });

  describe('removeCategory', () => {
    test('should remove existing category', () => {
      const wikitext = 'Text\n[[Category:A]]\n[[Category:B]]';
      const result = parser.removeCategory(wikitext, 'Category:A');
      expect(result).not.toContain('[[Category:A]]');
      expect(result).toContain('[[Category:B]]');
    });

    test('should handle category with sort key', () => {
      const wikitext = '[[Category:Test|SortKey]]\n[[Category:Other]]';
      const result = parser.removeCategory(wikitext, 'Category:Test');
      expect(result).not.toContain('Category:Test');
      expect(result).toContain('[[Category:Other]]');
    });

    test('should not modify text when category does not exist', () => {
      const wikitext = '[[Category:A]]';
      const result = parser.removeCategory(wikitext, 'Category:NonExistent');
      expect(result).toContain('[[Category:A]]');
    });

    test('should handle name without Category: prefix', () => {
      const wikitext = '[[Category:Test]]\nOther text';
      const result = parser.removeCategory(wikitext, 'Test');
      expect(result).not.toContain('[[Category:Test]]');
    });
  });

  describe('escapeRegex', () => {
    test('should escape special regex characters', () => {
      expect(parser.escapeRegex('test.thing')).toBe('test\\.thing');
      expect(parser.escapeRegex('a+b')).toBe('a\\+b');
      expect(parser.escapeRegex('(test)')).toBe('\\(test\\)');
    });
  });

  describe('getCategorySyntax', () => {
    test('should return proper syntax with prefix', () => {
      expect(parser.getCategorySyntax('Category:Test')).toBe('[[Category:Test]]');
    });

    test('should return proper syntax without prefix', () => {
      expect(parser.getCategorySyntax('Test')).toBe('[[Category:Test]]');
    });
  });
});
