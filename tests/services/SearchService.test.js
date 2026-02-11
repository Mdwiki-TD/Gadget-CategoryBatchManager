const { default: SearchService } = require('../../src/services/SearchService');
const { default: FileModel } = require('../../src/models/FileModel');

// Mock global FileModel for SearchService
global.FileModel = FileModel;

describe('SearchService', () => {
  let service;
  let mockApi;
  let mockConsoleLog;

  beforeEach(() => {
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    mockApi = {
      makeRequest: jest.fn(),
      getFileInfo: jest.fn(),
      searchInCategory: jest.fn(),
      searchInCategoryWithPattern: jest.fn()
    };
    service = new SearchService(mockApi);
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  describe('createBatches', () => {
    test('should create batches of specified size', () => {
      const items = [1, 2, 3, 4, 5];
      const batches = service.createBatches(items, 2);
      expect(batches).toEqual([[1, 2], [3, 4], [5]]);
    });

    test('should handle empty array', () => {
      const batches = service.createBatches([], 2);
      expect(batches).toEqual([]);
    });

    test('should handle array smaller than batch size', () => {
      const items = [1, 2];
      const batches = service.createBatches(items, 5);
      expect(batches).toEqual([[1, 2]]);
    });

    test('should handle array equal to batch size', () => {
      const items = [1, 2, 3];
      const batches = service.createBatches(items, 3);
      expect(batches).toEqual([[1, 2, 3]]);
    });
  });

  describe('_parseFileInfo', () => {
    test('should parse API response into file models', () => {
      const apiResponse = {
        query: {
          pages: {
            '123': {
              title: 'File:Test.svg',
              pageid: 123,
              categories: [
                { title: 'Category:A' },
                { title: 'Category:B' }
              ]
            }
          }
        }
      };

      const result = service._parseFileInfo(apiResponse);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('File:Test.svg');
      expect(result[0].pageid).toBe(123);
      expect(result[0].currentCategories).toEqual(['Category:A', 'Category:B']);
    });

    test('should skip missing pages (negative ids)', () => {
      const apiResponse = {
        query: {
          pages: {
            '-1': { title: 'File:Missing.svg', missing: '' }
          }
        }
      };

      const result = service._parseFileInfo(apiResponse);
      expect(result).toHaveLength(0);
    });
  });

  describe('searchWithPattern', () => {
    test('should search using raw srsearch pattern', async () => {
      mockApi.searchInCategoryWithPattern.mockResolvedValue([
        { title: 'File:Chart,BLR.svg', pageid: 1, size: 1000 },
        { title: 'File:Chart,BLR_2.svg', pageid: 3, size: 2000 }
      ]);

      mockApi.getFileInfo.mockResolvedValue({
        query: {
          pages: {
            '1': { title: 'File:Chart,BLR.svg', pageid: 1, categories: [] },
            '3': { title: 'File:Chart,BLR_2.svg', pageid: 3, categories: [] }
          }
        }
      });

      const result = await service.searchWithPattern('incategory:Belarus intitle:/^Chart/');

      expect(result).toHaveLength(2);
      expect(mockApi.searchInCategoryWithPattern).toHaveBeenCalledWith('incategory:Belarus intitle:/^Chart/', {});
    });

    test('should return empty array when no matches', async () => {
      mockApi.searchInCategoryWithPattern.mockResolvedValue([]);

      const result = await service.searchWithPattern('incategory:NonExistent');

      expect(result).toEqual([]);
      expect(mockApi.getFileInfo).not.toHaveBeenCalled();
    });

    test('should fetch file details for search results', async () => {
      mockApi.searchInCategoryWithPattern.mockResolvedValue([
        { title: 'File:Test.svg', pageid: 123, size: 1000 }
      ]);

      mockApi.getFileInfo.mockResolvedValue({
        query: {
          pages: {
            '123': { title: 'File:Test.svg', pageid: 123, categories: [{ title: 'Category:A' }] }
          }
        }
      });

      const result = await service.searchWithPattern('incategory:Test');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('File:Test.svg');
      expect(result[0].currentCategories).toEqual(['Category:A']);
    });

    test('should handle stop request', async () => {
      mockApi.searchInCategoryWithPattern.mockImplementation(() => {
        service.shouldStopSearch = true;
        return Promise.resolve([
          { title: 'File:Test.svg', pageid: 1, size: 1000 }
        ]);
      });

      const result = await service.searchWithPattern('incategory:Test');

      expect(result).toEqual([]);
      expect(mockApi.getFileInfo).not.toHaveBeenCalled();
    });

    test('should reset search flag before starting search', async () => {
      service.shouldStopSearch = true;
      mockApi.searchInCategoryWithPattern.mockResolvedValue([]);

      await service.searchWithPattern('incategory:Test');

      expect(service.shouldStopSearch).toBe(false);
    });

    test('should handle search API errors', async () => {
      mockApi.searchInCategoryWithPattern.mockRejectedValue(new Error('Search API error'));

      await expect(
        service.searchWithPattern('incategory:Test')
      ).rejects.toThrow('Search API error');
    });

    test('should handle pagination in search results', async () => {
      mockApi.searchInCategoryWithPattern.mockResolvedValue([
        { title: 'File:Chart1.svg', pageid: 1, size: 1000 },
        { title: 'File:Chart2.svg', pageid: 2, size: 2000 },
        { title: 'File:Chart3.svg', pageid: 3, size: 3000 }
      ]);

      mockApi.getFileInfo.mockResolvedValue({
        query: {
          pages: {
            '1': { title: 'File:Chart1.svg', pageid: 1, categories: [] },
            '2': { title: 'File:Chart2.svg', pageid: 2, categories: [] },
            '3': { title: 'File:Chart3.svg', pageid: 3, categories: [] }
          }
        }
      });

      const result = await service.searchWithPattern('incategory:Test');

      expect(result).toHaveLength(3);
    });

    test('should handle complex search patterns', async () => {
      mockApi.searchInCategoryWithPattern.mockResolvedValue([]);

      const complexPattern = 'incategory:Belarus intitle:/^Charts/ incategory:Maps -intitle:/draft/';

      await service.searchWithPattern(complexPattern);

      expect(mockApi.searchInCategoryWithPattern).toHaveBeenCalledWith(complexPattern, {});
    });

    test('should create FileModel instances from search results', async () => {
      mockApi.searchInCategoryWithPattern.mockResolvedValue([
        { title: 'File:Test.svg', pageid: 123, size: 5000, wordcount: 100, timestamp: '2023-01-01' }
      ]);

      mockApi.getFileInfo.mockResolvedValue({
        query: {
          pages: {
            '123': { title: 'File:Test.svg', pageid: 123, categories: [{ title: 'Category:Test' }] }
          }
        }
      });

      const result = await service.searchWithPattern('incategory:Test');

      expect(result[0]).toBeInstanceOf(FileModel);
      expect(result[0].title).toBe('File:Test.svg');
    });
  });

  describe('stopSearch', () => {
    test('should set shouldStopSearch flag to true', () => {
      service.stopSearch();
      expect(service.shouldStopSearch).toBe(true);
    });

  });

  describe('_getFilesDetails', () => {
    test('should return empty array when no files provided', async () => {
      const result = await service._getFilesDetails([]);
      expect(result).toEqual([]);
      expect(mockApi.getFileInfo).not.toHaveBeenCalled();
    });

    test('should fetch file details in batches', async () => {
      const files = Array.from({ length: 150 }, (_, i) => ({
        title: `File:Test${i}.svg`,
        pageid: i
      }));

      mockApi.getFileInfo.mockResolvedValue({
        query: {
          pages: {}
        }
      });

      await service._getFilesDetails(files);

      expect(mockApi.getFileInfo).toHaveBeenCalledTimes(3);
    });

    test('should create batches of correct size', async () => {
      const files = Array.from({ length: 120 }, (_, i) => ({
        title: `File:Test${i}.svg`,
        pageid: i
      }));

      mockApi.getFileInfo.mockResolvedValue({ query: { pages: {} } });

      await service._getFilesDetails(files);

      expect(mockApi.getFileInfo).toHaveBeenCalledTimes(3);
    });

    test('should handle single file batch', async () => {
      const files = [{ title: 'File:Test.svg', pageid: 1 }];

      mockApi.getFileInfo.mockResolvedValue({
        query: {
          pages: {
            '1': { title: 'File:Test.svg', pageid: 1, categories: [] }
          }
        }
      });

      const result = await service._getFilesDetails(files);

      expect(mockApi.getFileInfo).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
    });

    test('should parse file info correctly', async () => {
      const files = [{ title: 'File:Test.svg', pageid: 123 }];

      mockApi.getFileInfo.mockResolvedValue({
        query: {
          pages: {
            '123': {
              title: 'File:Test.svg',
              pageid: 123,
              categories: [{ title: 'Category:Test' }],
              imageinfo: [{ url: 'http://example.com/thumb.png', size: 5000 }]
            }
          }
        }
      });

      const result = await service._getFilesDetails(files);

      expect(result[0].title).toBe('File:Test.svg');
      expect(result[0].thumbnail).toBe('http://example.com/thumb.png');
      expect(result[0].size).toBe(5000);
    });

    test('should stop during file details fetch and log message', async () => {
      // Use 60 files to create multiple batches (50 per batch)
      const files = Array.from({ length: 60 }, (_, i) => ({
        title: `File:Test${i}.svg`,
        pageid: i
      }));

      let batchNumber = 0;
      mockApi.getFileInfo.mockImplementation(async () => {
        batchNumber++;
        // After first batch, set stop flag
        if (batchNumber === 1) {
          await Promise.resolve();
          service.shouldStopSearch = true;
          return {
            query: {
              pages: {
                '0': { title: 'File:Test0.svg', pageid: 0, categories: [] }
              }
            }
          };
        }
        return {
          query: {
            pages: {}
          }
        };
      });

      const result = await service._getFilesDetails(files);

      expect(mockConsoleLog).toHaveBeenCalledWith('[CBM-FS] Search stopped during file details fetch');
    });
  });

  describe('resetSearchFlag', () => {
    test('should reset shouldStopSearch flag to false', () => {
      service.shouldStopSearch = true;
      service.resetSearchFlag();
      expect(service.shouldStopSearch).toBe(false);
    });

  });
});
