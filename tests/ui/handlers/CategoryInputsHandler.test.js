const { default: CategoryInputsHandler } = require('../../src/ui/handlers/CategoryInputsHandler');

describe('CategoryInputsHandler', () => {
  let handler;
  let mockApiService;
  let mockConsoleWarn;

  beforeEach(() => {
    // Suppress console.warn in tests
    mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockApiService = {
      fetchCategories: jest.fn()
    };
    handler = new CategoryInputsHandler(mockApiService);
  });

  afterEach(() => {
    mockConsoleWarn.mockRestore();
  });

  describe('deduplicateResults', () => {
    test('should remove duplicates from results', () => {
      const items1 = [
        { value: 'Category:A' },
        { value: 'Category:B' }
      ];
      const results = [
        { value: 'Category:A' },
        { value: 'Category:C' },
        { value: 'Category:B' }
      ];

      const deduplicated = handler.deduplicateResults(items1, results);

      expect(deduplicated).toEqual([{ value: 'Category:C' }]);
    });

    test('should return empty array when all results are duplicates', () => {
      const items1 = [
        { value: 'Category:A' },
        { value: 'Category:B' }
      ];
      const results = [
        { value: 'Category:A' },
        { value: 'Category:B' }
      ];

      const deduplicated = handler.deduplicateResults(items1, results);

      expect(deduplicated).toEqual([]);
    });

    test('should return all results when no duplicates', () => {
      const items1 = [
        { value: 'Category:A' }
      ];
      const results = [
        { value: 'Category:B' },
        { value: 'Category:C' }
      ];

      const deduplicated = handler.deduplicateResults(items1, results);

      expect(deduplicated).toEqual(results);
    });

    test('should handle empty items1', () => {
      const items1 = [];
      const results = [
        { value: 'Category:A' },
        { value: 'Category:B' }
      ];

      const deduplicated = handler.deduplicateResults(items1, results);

      expect(deduplicated).toEqual(results);
    });

    test('should handle empty results', () => {
      const items1 = [
        { value: 'Category:A' }
      ];
      const results = [];

      const deduplicated = handler.deduplicateResults(items1, results);

      expect(deduplicated).toEqual([]);
    });
  });

  describe('onCategoryInput', () => {
    test('should return empty array when value is empty', async () => {
      const result = await handler.onCategoryInput('', 'test');

      expect(result).toEqual([]);
      expect(mockApiService.fetchCategories).not.toHaveBeenCalled();
    });

    test('should return empty array when value is too short', async () => {
      const result = await handler.onCategoryInput('a', 'a');

      expect(result).toEqual([]);
      expect(mockApiService.fetchCategories).not.toHaveBeenCalled();
    });

    test('should return null when input value changes during fetch', async () => {
      mockApiService.fetchCategories.mockResolvedValue([{ value: 'Category:Test' }]);

      const result = await handler.onCategoryInput('initial', 'changed');

      expect(result).toBeNull();
    });

    test('should return empty array when no results from API', async () => {
      mockApiService.fetchCategories.mockResolvedValue([]);

      const result = await handler.onCategoryInput('test', 'test');

      expect(result).toEqual([]);
    });

    test('should return empty array when API returns null', async () => {
      mockApiService.fetchCategories.mockResolvedValue(null);

      const result = await handler.onCategoryInput('test', 'test');

      expect(result).toEqual([]);
    });

    test('should return data when API call succeeds', async () => {
      const mockData = [
        { value: 'Category:Test1' },
        { value: 'Category:Test2' }
      ];
      mockApiService.fetchCategories.mockResolvedValue(mockData);

      const result = await handler.onCategoryInput('test', 'test');

      expect(result).toEqual(mockData);
      expect(mockApiService.fetchCategories).toHaveBeenCalledWith('test');
    });

    test('should use custom input_type in console warnings', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await handler.onCategoryInput('', '', 'remove');

      expect(consoleWarnSpy).toHaveBeenCalledWith('remove category input cleared, clearing menu items.');

      consoleWarnSpy.mockRestore();
    });
  });

  describe('onLoadMore', () => {
    test('should return empty array when Category.input is falsy', async () => {
      const result = await handler.onLoadMore({ input: null });

      expect(result).toEqual([]);
      expect(mockApiService.fetchCategories).not.toHaveBeenCalled();
    });

    test('should return empty array when API returns no results', async () => {
      mockApiService.fetchCategories.mockResolvedValue([]);

      const result = await handler.onLoadMore({ input: 'test', menuItems: [] });

      expect(result).toEqual([]);
    });

    test('should return empty array when API returns null', async () => {
      mockApiService.fetchCategories.mockResolvedValue(null);

      const result = await handler.onLoadMore({ input: 'test', menuItems: [] });

      expect(result).toEqual([]);
    });

    test('should fetch with offset based on menuItems length', async () => {
      const mockData = [{ value: 'Category:New' }];
      mockApiService.fetchCategories.mockResolvedValue(mockData);

      const category = {
        input: 'test',
        menuItems: [
          { value: 'Category:A' },
          { value: 'Category:B' }
        ]
      };

      const result = await handler.onLoadMore(category);

      expect(mockApiService.fetchCategories).toHaveBeenCalledWith('test', { offset: 2 });
      expect(result).toEqual(mockData);
    });

    test('should deduplicate results with existing menuItems', async () => {
      const mockData = [
        { value: 'Category:A' },
        { value: 'Category:B' },
        { value: 'Category:C' }
      ];
      mockApiService.fetchCategories.mockResolvedValue(mockData);

      const category = {
        input: 'test',
        menuItems: [
          { value: 'Category:A' }
        ]
      };

      const result = await handler.onLoadMore(category);

      expect(result).toEqual([
        { value: 'Category:B' },
        { value: 'Category:C' }
      ]);
    });

    test('should use custom input_type in console warnings', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await handler.onLoadMore({ input: null }, 'add');

      expect(consoleWarnSpy).toHaveBeenCalledWith('No input value for add categories, cannot load more.');

      consoleWarnSpy.mockRestore();
    });
  });
});
