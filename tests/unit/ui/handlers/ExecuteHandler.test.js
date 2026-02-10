const ExecuteHandler = require('../../../../src/ui/handlers/ExecuteHandler');

describe('ExecuteHandler', () => {
  let handler;
  let mockValidator;
  let mockBatchProcessor;

  beforeEach(() => {
    mockValidator = {};
    mockBatchProcessor = {
      processBatch: jest.fn(),
      stop: jest.fn()
    };
    handler = new ExecuteHandler(mockValidator, mockBatchProcessor);
  });

  describe('generateConfirmMessage', () => {
    test('should generate message with add and remove categories', () => {
      const message = handler.generateConfirmMessage(
        5,
        ['Category:A', 'Category:B'],
        ['Category:C']
      );

      expect(message).toContain('5 file(s)');
      expect(message).toContain('Category:A, Category:B');
      expect(message).toContain('Category:C');
      expect(message).toContain('Do you want to proceed?');
    });

    test('should show "none" for categories when no categories to add', () => {
      const message = handler.generateConfirmMessage(
        3,
        [],
        ['Category:C']
      );

      expect(message).toContain('Categories to add: none');
      expect(message).toContain('Categories to remove: Category:C');
    });

    test('should show "none" for categories when no categories to remove', () => {
      const message = handler.generateConfirmMessage(
        2,
        ['Category:A'],
        []
      );

      expect(message).toContain('Categories to add: Category:A');
      expect(message).toContain('Categories to remove: none');
    });

    test('should show "none" for both when no categories', () => {
      const message = handler.generateConfirmMessage(
        1,
        [],
        []
      );

      expect(message).toContain('Categories to add: none');
      expect(message).toContain('Categories to remove: none');
    });

    test('should format multi-line message correctly', () => {
      const message = handler.generateConfirmMessage(
        10,
        ['Category:A'],
        ['Category:B']
      );

      const lines = message.split('\n');
      expect(lines[0]).toBe('You are about to update 10 file(s).');
      expect(lines[1]).toBe('');
      expect(lines[2]).toBe('Categories to add: Category:A');
      expect(lines[3]).toBe('Categories to remove: Category:B');
      expect(lines[4]).toBe('');
      expect(lines[5]).toBe('Do you want to proceed?');
    });
  });

  describe('executeBatch', () => {
    test('should call batchProcessor.processBatch with correct parameters', async () => {
      const files = [
        { title: 'File:Test1.svg' },
        { title: 'File:Test2.svg' }
      ];
      const addCategories = ['Category:A'];
      const removeCategories = ['Category:B'];
      const callbacks = { onProgress: jest.fn() };

      const expectedResult = { success: true, processed: 2 };
      mockBatchProcessor.processBatch.mockResolvedValue(expectedResult);

      const result = await handler.executeBatch(
        files,
        addCategories,
        removeCategories,
        callbacks
      );

      expect(mockBatchProcessor.processBatch).toHaveBeenCalledWith(
        files,
        addCategories,
        removeCategories,
        callbacks
      );
      expect(result).toEqual(expectedResult);
    });

    test('should handle empty files array', async () => {
      mockBatchProcessor.processBatch.mockResolvedValue(undefined);

      const result = await handler.executeBatch([], [], [], {});

      expect(mockBatchProcessor.processBatch).toHaveBeenCalledWith([], [], [], {});
      expect(result).toBeUndefined();
    });

    test('should pass through callbacks correctly', async () => {
      const callbacks = {
        onProgress: jest.fn(),
        onComplete: jest.fn(),
        onError: jest.fn()
      };

      mockBatchProcessor.processBatch.mockResolvedValue({ success: true });

      await handler.executeBatch(
        [{ title: 'File:Test.svg' }],
        ['Category:A'],
        [],
        callbacks
      );

      expect(mockBatchProcessor.processBatch).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Array),
        expect.any(Array),
        callbacks
      );
    });
  });

  describe('stopBatch', () => {
    test('should call batchProcessor.stop', () => {
      handler.stopBatch();

      expect(mockBatchProcessor.stop).toHaveBeenCalledTimes(1);
    });

    test('should be callable multiple times', () => {
      handler.stopBatch();
      handler.stopBatch();
      handler.stopBatch();

      expect(mockBatchProcessor.stop).toHaveBeenCalledTimes(3);
    });
  });
});
