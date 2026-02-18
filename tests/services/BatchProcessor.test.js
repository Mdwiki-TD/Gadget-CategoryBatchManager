const { default: BatchProcessor } = require('../../src/services/BatchProcessor');

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
  let mockConsoleLog;

  beforeEach(() => {
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    mockCategoryService = {
      updateCategories: jest.fn().mockResolvedValue({ success: true, modified: true }),
      api: {
        fetchUserRateLimits: jest.fn().mockResolvedValue({ hits: 100, seconds: 60 })
      }
    };
    processor = new BatchProcessor(mockCategoryService);

    // Mock rate_limiter.wait() to avoid 2 second delays in tests
    processor.rate_limiter.wait = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
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

    test('should stop batch processing when stop flag is set', async () => {
      const files = [
        { title: 'File:A.svg' },
        { title: 'File:B.svg' },
        { title: 'File:C.svg' }
      ];

      mockCategoryService.updateCategories.mockImplementation(() => {
        processor.stop();
        return Promise.resolve({ success: true, modified: true });
      });

      const results = await processor.processBatch(
        files,
        ['Category:Test'],
        []
      );

      expect(results.processed).toBe(1);
      expect(results.total).toBe(3);
    });

    test('should log message when stopping batch', async () => {
      const files = [
        { title: 'File:A.svg' },
        { title: 'File:B.svg' }
      ];

      mockCategoryService.updateCategories.mockImplementation(() => {
        processor.stop();
        return Promise.resolve({ success: true, modified: true });
      });

      await processor.processBatch(files, ['Category:Test'], []);

      expect(mockConsoleLog).toHaveBeenCalledWith('[CBM-BP] Batch processing stopped by user');
    });
  });

  describe('stop', () => {
    test('should set shouldStop flag to true', () => {
      processor.stop();
      expect(processor.shouldStop).toBe(true);
    });
  });

  describe('reset', () => {
    test('should set shouldStop flag to false', () => {
      processor.shouldStop = true;
      processor.reset();
      expect(processor.shouldStop).toBe(false);
    });

    test('should be called automatically at start of processBatch', async () => {
      processor.shouldStop = true;
      const files = [{ title: 'File:A.svg' }];

      await processor.processBatch(files, ['Category:Test'], []);

      expect(processor.shouldStop).toBe(false);
    });
  });

  describe('stop', () => {
    test('should set shouldStop flag to true', () => {
      processor.stop();
      expect(processor.shouldStop).toBe(true);
    });

    test('should stop batch processing when called', async () => {
      const files = [
        { title: 'File:A.svg' },
        { title: 'File:B.svg' },
        { title: 'File:C.svg' }
      ];

      // Make the first call trigger stop
      mockCategoryService.updateCategories.mockImplementation(() => {
        processor.stop();
        return Promise.resolve({ success: true, modified: true });
      });

      const results = await processor.processBatch(
        files,
        ['Category:Test'],
        []
      );

      expect(results.processed).toBe(1);
      expect(results.total).toBe(3);
    });

    test('should log message when stopping batch', async () => {
      const files = [
        { title: 'File:A.svg' },
        { title: 'File:B.svg' }
      ];

      mockCategoryService.updateCategories.mockImplementation(() => {
        processor.stop();
        return Promise.resolve({ success: true, modified: true });
      });

      await processor.processBatch(files, ['Category:Test'], []);

      expect(mockConsoleLog).toHaveBeenCalledWith('[CBM-BP] Batch processing stopped by user');
    });
  });

  describe('reset', () => {
    test('should set shouldStop flag to false', () => {
      processor.shouldStop = true;
      processor.reset();
      expect(processor.shouldStop).toBe(false);
    });

    test('should be called automatically at start of processBatch', async () => {
      processor.shouldStop = true;
      const files = [{ title: 'File:A.svg' }];

      await processor.processBatch(files, ['Category:Test'], []);

      expect(processor.shouldStop).toBe(false);
    });
  });

  describe('initRateLimiter', () => {
    test('should skip API call if rate limiter already configured', async () => {
      // First call configures the rate limiter
      await processor.initRateLimiter();
      expect(mockCategoryService.api.fetchUserRateLimits).toHaveBeenCalledTimes(1);

      // Second call should skip the API call
      await processor.initRateLimiter();
      expect(mockCategoryService.api.fetchUserRateLimits).toHaveBeenCalledTimes(1);
    });
  });

  describe('rate limit handling', () => {
    test('should handle rate limit errors with backoff', async () => {
      const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Simulate rate limit error with error.code
      mockCategoryService.updateCategories.mockRejectedValue({
        code: 'ratelimited',
        message: 'ratelimited'
      });

      const onError = jest.fn();
      const files = [{ title: 'File:A.svg' }];

      const results = await processor.processBatch(
        files,
        ['Category:Test'],
        [],
        { onError }
      );

      expect(results.processed).toBe(1);
      expect(results.failed).toBe(1);
      expect(results.errors[0].error).toBe('Rate limited');
      expect(onError).toHaveBeenCalled();
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        '[CBM-BP] ratelimited — waiting 60 s before continuing'
      );
      // Verify wait was called with 60 seconds
      expect(processor.rate_limiter.wait).toHaveBeenCalledWith(60000);

      mockConsoleWarn.mockRestore();
    });

    test('should handle rate limit errors with message property', async () => {
      // Simulate rate limit error with message only
      mockCategoryService.updateCategories.mockRejectedValue({
        message: 'ratelimited'
      });

      const files = [{ title: 'File:A.svg' }];

      const results = await processor.processBatch(files, ['Category:Test'], []);

      expect(results.processed).toBe(1);
      expect(results.failed).toBe(1);
    });
  });
});
