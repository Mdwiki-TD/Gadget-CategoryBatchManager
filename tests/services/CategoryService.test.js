const { default: CategoryService } = require('../../src/services/CategoryService');
const { default: WikitextParser } = require('../../src/utils/WikitextParser');

// Make WikitextParser available globally for CategoryService
global.WikitextParser = WikitextParser;

// Mock the mw module
let mockMwApiEdit = jest.fn();

jest.mock('../../src/services/mw.js', () => ({
  __esModule: true,
  default: {
    Api: jest.fn().mockImplementation(() => ({
      edit: mockMwApiEdit
    })),
    config: {
      get: jest.fn((key) => {
        if (key === 'wgUserName') return 'TestUser';
        return undefined;
      })
    }
  }
}));

describe('CategoryService', () => {
  let service;
  let mockApi;

  beforeEach(() => {
    // Reset the mock before each test
    mockMwApiEdit = jest.fn();

    // Update the mock implementation for this test
    require('../../src/services/mw.js').default.Api = jest.fn().mockImplementation(() => ({
      edit: mockMwApiEdit
    }));

    mockApi = {
      getPageContent: jest.fn(),
      editPage: jest.fn().mockResolvedValue({ edit: { result: 'Success' } })
    };
    service = new CategoryService(mockApi);
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

  describe('updateCategoriesOptimized', () => {
    test('should add and remove categories using mw.Api.edit', async () => {
      mockMwApiEdit.mockResolvedValue({ result: 'Success' });

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
      mockMwApiEdit.mockRejectedValue('no-changes');

      const result = await service.updateCategoriesOptimized(
        'File:Test.svg',
        ['Category:Existing'],
        []
      );

      expect(result.success).toBe(true);
      expect(result.modified).toBe(false);
    });

    test('should return false when no changes needed', async () => {
      mockMwApiEdit.mockRejectedValue('no-changes');

      const result = await service.updateCategoriesOptimized(
        'File:Test.svg',
        ['Category:Existing'],
        []
      );

      expect(result.success).toBe(true);
      expect(result.modified).toBe(false);
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

    test('should handle nocreate-missing error', async () => {
      mockMwApiEdit.mockRejectedValue('nocreate-missing');

      const result = await service.updateCategoriesOptimized(
        'File:Test.svg',
        ['Category:New'],
        []
      );

      expect(result.success).toBe(false);
      expect(result.modified).toBe(false);
      expect(result.error).toBe('Page does not exist');
    });

    test('should handle invalidtitle error', async () => {
      mockMwApiEdit.mockRejectedValue('invalidtitle');

      const result = await service.updateCategoriesOptimized(
        'File:Test.svg',
        ['Category:New'],
        []
      );

      expect(result.success).toBe(false);
      expect(result.modified).toBe(false);
      expect(result.error).toBe('Invalid title');
    });

    test('should handle unknown error', async () => {
      mockMwApiEdit.mockRejectedValue('unknown');

      const result = await service.updateCategoriesOptimized(
        'File:Test.svg',
        ['Category:New'],
        []
      );

      expect(result.success).toBe(false);
      expect(result.modified).toBe(false);
      expect(result.error).toBe('Unknown API error');
    });

    test('should handle no-changes via transform callback rejection', async () => {
      let capturedTransformFn;
      mockMwApiEdit.mockImplementation((title, fn) => {
        capturedTransformFn = fn;
        // Simulate the rejection that occurs when transform returns Promise.reject('no-changes')
        return Promise.reject('no-changes');
      });

      await service.updateCategoriesOptimized(
        'File:Test.svg',
        [],
        []
      );

      // Verify the callback was captured and would reject when content is unchanged
      const mockRevision = { content: '[[Category:Existing]]' };
      const result = capturedTransformFn(mockRevision);

      // The transform function should return a rejected promise for unchanged content
      await expect(result).rejects.toBe('no-changes');
    });
  });
});
