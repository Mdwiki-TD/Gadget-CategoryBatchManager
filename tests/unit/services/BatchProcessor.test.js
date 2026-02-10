const BatchProcessor = require('../../../src/services/BatchProcessor');

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

describe('BatchProcessor', () => {
  let processor;
  let mockCategoryService;

  beforeEach(() => {
    mockCategoryService = {
      updateCategories: jest.fn().mockResolvedValue({ success: true, modified: true })
    };
    processor = new BatchProcessor(mockCategoryService);
  });

  describe('processBatch', () => {
    test('should process all files successfully', async () => {
      const files = [
        { title: 'File:A.svg' },
        { title: 'File:B.svg' }
      ];

      const results = await processor.processBatch(
        files,
        ['Category:Test'],
        []
      );

      expect(results.total).toBe(2);
      expect(results.processed).toBe(2);
      expect(results.successful).toBe(2);
      expect(results.skipped).toBe(0);
      expect(results.failed).toBe(0);
      expect(results.errors).toHaveLength(0);
    }); test('should handle errors in individual files', async () => {
      mockCategoryService.updateCategories
        .mockResolvedValueOnce({ success: true, modified: true })
        .mockRejectedValueOnce(new Error('Edit conflict'));

      const files = [
        { title: 'File:A.svg' },
        { title: 'File:B.svg' }
      ];

      const results = await processor.processBatch(
        files,
        ['Category:Test'],
        []
      );

      expect(results.total).toBe(2);
      expect(results.processed).toBe(2);
      expect(results.successful).toBe(1);
      expect(results.failed).toBe(1);
      expect(results.errors).toHaveLength(1);
      expect(results.errors[0].file).toBe('File:B.svg');
    });

    test('should count skipped files when no changes made', async () => {
      mockCategoryService.updateCategories
        .mockResolvedValueOnce({ success: true, modified: true })
        .mockResolvedValueOnce({ success: true, modified: false });

      const files = [
        { title: 'File:A.svg' },
        { title: 'File:B.svg' }
      ];

      const results = await processor.processBatch(
        files,
        ['Category:Test'],
        []
      );

      expect(results.total).toBe(2);
      expect(results.processed).toBe(2);
      expect(results.successful).toBe(1);
      expect(results.skipped).toBe(1);
      expect(results.failed).toBe(0);
    });

    test('should call progress callback', async () => {
      const onProgress = jest.fn();
      const files = [{ title: 'File:A.svg' }];

      await processor.processBatch(
        files,
        ['Category:Test'],
        [],
        { onProgress }
      );

      expect(onProgress).toHaveBeenCalled();
    });

    test('should call onFileComplete callback', async () => {
      const onFileComplete = jest.fn();
      const files = [{ title: 'File:A.svg' }];

      await processor.processBatch(
        files,
        ['Category:Test'],
        [],
        { onFileComplete }
      );

      expect(onFileComplete).toHaveBeenCalledWith(files[0], true);
    });

    test('should call onError callback on failure', async () => {
      mockCategoryService.updateCategories.mockRejectedValue(new Error('fail'));
      const onError = jest.fn();
      const files = [{ title: 'File:A.svg' }];

      await processor.processBatch(
        files,
        ['Category:Test'],
        [],
        { onError }
      );

      expect(onError).toHaveBeenCalled();
    });
  });
});
