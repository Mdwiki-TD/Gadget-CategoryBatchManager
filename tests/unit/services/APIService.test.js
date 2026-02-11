const { default: APIService } = require('../../../src/services/APIService');
const { default: Validator } = require('../../../src/utils/Validator');

describe('APIService', () => {
  let service;
  let mockMwApi;
  let mockConsoleError;
  let sanitizeSpy;

  beforeEach(() => {
    // Mock console.error to suppress error messages during tests
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Spy on Validator.sanitizeTitlePattern
    sanitizeSpy = jest.spyOn(Validator, 'sanitizeTitlePattern');

    // Mock mw.Api
    mockMwApi = {
      get: jest.fn(),
      edit: jest.fn(),
      getCategories: jest.fn(),
      postWithToken: jest.fn()
    };

    // Mock global mw object
    global.mw = {
      Api: jest.fn(() => mockMwApi)
    };

    service = new APIService();
  });

  afterEach(() => {
    delete global.mw;
    sanitizeSpy.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('getCategoryMembers', () => {
    test('should fetch category members without pagination', async () => {
      mockMwApi.get.mockResolvedValue({
        query: {
          categorymembers: [
            { title: 'File:Test1.svg', pageid: 1 },
            { title: 'File:Test2.svg', pageid: 2 }
          ]
        }
      });

      const result = await service.getCategoryMembers('Category:Test');

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('File:Test1.svg');
      expect(mockMwApi.get).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'query',
          list: 'categorymembers',
          cmtitle: 'Category:Test',
          cmtype: 'file'
        })
      );
    });

    test('should handle pagination with continue', async () => {
      mockMwApi.get
        .mockResolvedValueOnce({
          query: {
            categorymembers: [
              { title: 'File:Test1.svg', pageid: 1 }
            ]
          },
          continue: { cmcontinue: 'page2' }
        })
        .mockResolvedValueOnce({
          query: {
            categorymembers: [
              { title: 'File:Test2.svg', pageid: 2 }
            ]
          }
        });

      const result = await service.getCategoryMembers('Category:Test');

      expect(result).toHaveLength(2);
      expect(mockMwApi.get).toHaveBeenCalledTimes(2);
    });

    test('should use custom limit option', async () => {
      mockMwApi.get.mockResolvedValue({
        query: { categorymembers: [] }
      });

      await service.getCategoryMembers('Category:Test', { limit: 100 });

      expect(mockMwApi.get).toHaveBeenCalledWith(
        expect.objectContaining({
          cmlimit: 100
        })
      );
    });
  });

  describe('getFileInfo', () => {
    test('should fetch file info with categories', async () => {
      const mockResponse = {
        query: {
          pages: {
            '123': {
              title: 'File:Test.svg',
              categories: [
                { title: 'Category:Belarus' },
                { title: 'Category:Europe' }
              ]
            }
          }
        }
      };

      mockMwApi.get.mockResolvedValue(mockResponse);

      const result = await service.getFileInfo(['File:Test.svg']);

      expect(result).toEqual(mockResponse);
      expect(mockMwApi.get).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'query',
          titles: 'File:Test.svg',
          prop: 'categories|imageinfo'
        })
      );
    });

    test('should handle multiple titles', async () => {
      mockMwApi.get.mockResolvedValue({
        query: { pages: {} }
      });

      await service.getFileInfo(['File:Test1.svg', 'File:Test2.svg']);

      expect(mockMwApi.get).toHaveBeenCalledWith(
        expect.objectContaining({
          titles: 'File:Test1.svg|File:Test2.svg'
        })
      );
    });
  });

  describe('getPageContent', () => {
    test('should fetch page wikitext content', async () => {
      mockMwApi.get.mockResolvedValue({
        query: {
          pages: {
            '123': {
              revisions: [{
                slots: {
                  main: {
                    '*': 'Test wikitext content\n[[Category:Test]]'
                  }
                }
              }]
            }
          }
        }
      });

      const content = await service.getPageContent('File:Test.svg');

      expect(content).toBe('Test wikitext content\n[[Category:Test]]');
      expect(mockMwApi.get).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'query',
          titles: 'File:Test.svg',
          prop: 'revisions',
          rvprop: 'content',
          rvslots: 'main'
        })
      );
    });
  });

  describe('getCategories', () => {
    test('should get categories using mw.Api.getCategories()', async () => {
      const mockTitles = [
        { toString: () => 'Category:Belarus' },
        { toString: () => 'Category:Europe' },
        { toString: () => 'Category:Maps' }
      ];

      mockMwApi.getCategories.mockResolvedValue(mockTitles);

      const result = await service.getCategories('File:Test.svg');

      expect(result).toEqual(['Belarus', 'Europe', 'Maps']);
      expect(mockMwApi.getCategories).toHaveBeenCalledWith('File:Test.svg');
    });

    test('should return false if page not found', async () => {
      mockMwApi.getCategories.mockResolvedValue(false);

      const result = await service.getCategories('File:NotFound.svg');

      expect(result).toBe(false);
    });

    test('should remove Category: prefix from results', async () => {
      const mockTitles = [
        { toString: () => 'Category:Test Category' }
      ];

      mockMwApi.getCategories.mockResolvedValue(mockTitles);

      const result = await service.getCategories('File:Test.svg');

      expect(result).toEqual(['Test Category']);
    });

    test('should handle errors gracefully', async () => {
      mockMwApi.getCategories.mockRejectedValue(new Error('API error'));

      await expect(service.getCategories('File:Test.svg'))
        .rejects.toThrow('API error');
    });
  });

  describe('editPage', () => {
    test('should edit page using mw.Api.edit() with transform function', async () => {
      mockMwApi.edit.mockResolvedValue({
        edit: { result: 'Success' }
      });

      await service.editPage('File:Test.svg', 'New content', 'Test edit');

      expect(mockMwApi.edit).toHaveBeenCalledWith(
        'File:Test.svg',
        expect.any(Function)
      );

      // Test the transform function
      const transformFn = mockMwApi.edit.mock.calls[0][1];
      const result = transformFn();

      expect(result).toEqual({
        text: 'New content',
        summary: 'Test edit'
      });
    });

    test('should pass additional options to edit', async () => {
      mockMwApi.edit.mockResolvedValue({
        edit: { result: 'Success' }
      });

      await service.editPage(
        'File:Test.svg',
        'New content',
        'Test edit',
        { minor: true, bot: true }
      );

      const transformFn = mockMwApi.edit.mock.calls[0][1];
      const result = transformFn();

      expect(result).toEqual({
        text: 'New content',
        summary: 'Test edit',
        minor: true,
        bot: true
      });
    });

    test('should handle edit conflicts', async () => {
      mockMwApi.edit.mockRejectedValue(new Error('editconflict'));

      await expect(
        service.editPage('File:Test.svg', 'Content', 'Summary')
      ).rejects.toThrow('editconflict');
    });
  });

  describe('makeRequest', () => {
    test('should make GET request using mw.Api.get()', async () => {
      const mockResponse = { query: { pages: {} } };
      mockMwApi.get.mockResolvedValue(mockResponse);

      const result = await service.makeRequest({
        action: 'query',
        titles: 'Test'
      });

      expect(result).toEqual(mockResponse);
      expect(mockMwApi.get).toHaveBeenCalledWith({
        action: 'query',
        titles: 'Test'
      });
    });

    test('should handle API errors', async () => {
      mockMwApi.get.mockRejectedValue(new Error('API error'));

      await expect(
        service.makeRequest({ action: 'query' })
      ).rejects.toThrow('API error');
    });
  });

  describe('Integration scenarios', () => {
    test('should handle category name with spaces', async () => {
      const mockTitles = [
        { toString: () => 'Category:Life expectancy maps of South America (no data)' }
      ];

      mockMwApi.getCategories.mockResolvedValue(mockTitles);

      const result = await service.getCategories('File:Test.svg');

      expect(result).toEqual(['Life expectancy maps of South America (no data)']);
    });

    test('should handle concurrent API calls', async () => {
      mockMwApi.get.mockResolvedValue({
        query: { categorymembers: [] }
      });

      const promises = [
        service.getCategoryMembers('Category:Test1'),
        service.getCategoryMembers('Category:Test2'),
        service.getCategoryMembers('Category:Test3')
      ];

      await Promise.all(promises);

      expect(mockMwApi.get).toHaveBeenCalledTimes(3);
    });

    test('should properly chain edit operations', async () => {
      mockMwApi.edit.mockResolvedValue({
        edit: { result: 'Success' }
      });

      await service.editPage('File:Test1.svg', 'Content1', 'Summary1');
      await service.editPage('File:Test2.svg', 'Content2', 'Summary2');

      expect(mockMwApi.edit).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error handling', () => {
    test('should handle network errors', async () => {
      mockMwApi.get.mockRejectedValue(new Error('Network error'));

      await expect(
        service.getCategoryMembers('Category:Test')
      ).rejects.toThrow('Network error');
    });

    test('should handle malformed API responses', async () => {
      mockMwApi.get.mockResolvedValue({
        // Missing query.categorymembers
        query: {}
      });

      await expect(
        service.getCategoryMembers('Category:Test')
      ).rejects.toThrow();
    });

    test('should handle empty category', async () => {
      mockMwApi.get.mockResolvedValue({
        query: {
          categorymembers: []
        }
      });

      const result = await service.getCategoryMembers('Category:Empty');

      expect(result).toEqual([]);
    });
  });

  describe('searchCategories', () => {
    test('should search categories by prefix', async () => {
      mockMwApi.get.mockResolvedValue([
        'Category:Belarus',
        ['Category:Belarus', 'Category:Belarusian maps', 'Category:Belarus charts'],
        [],
        []
      ]);

      const result = await service.searchCategories('Bel');

      expect(result).toEqual(['Category:Belarus', 'Category:Belarusian maps', 'Category:Belarus charts']);
      expect(mockMwApi.get).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'opensearch',
          search: 'Category:Bel',
          namespace: 14
        })
      );
    });

    test('should handle prefix with Category: prefix', async () => {
      mockMwApi.get.mockResolvedValue([
        'Category:Europe',
        ['Category:Europe', 'Category:European maps'],
        [],
        []
      ]);

      const result = await service.searchCategories('Category:Eur');

      expect(result).toEqual(['Category:Europe', 'Category:European maps']);
      expect(mockMwApi.get).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'Category:Eur'
        })
      );
    });

    test('should filter non-category results', async () => {
      mockMwApi.get.mockResolvedValue([
        'Category:Test',
        ['Category:Test', 'File:Test.jpg', 'Category:Test maps'],
        [],
        []
      ]);

      const result = await service.searchCategories('Test');

      expect(result).toEqual(['Category:Test', 'Category:Test maps']);
    });

    test('should return empty array on error', async () => {
      mockMwApi.get.mockRejectedValue(new Error('API error'));

      const result = await service.searchCategories('Test');

      expect(result).toEqual([]);
    });

    test('should handle empty results', async () => {
      mockMwApi.get.mockResolvedValue([
        'Category:Test',
        [],
        [],
        []
      ]);

      const result = await service.searchCategories('NonExistent');

      expect(result).toEqual([]);
    });

    test('should use custom limit option', async () => {
      mockMwApi.get.mockResolvedValue([
        'Category:Test',
        ['Category:Test'],
        [],
        []
      ]);

      await service.searchCategories('Test', { limit: 20 });

      expect(mockMwApi.get).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20
        })
      );
    });

    test('should use default limit of 10', async () => {
      mockMwApi.get.mockResolvedValue([
        'Category:Test',
        ['Category:Test'],
        [],
        []
      ]);

      await service.searchCategories('Test');

      expect(mockMwApi.get).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10
        })
      );
    });
  });

  describe('searchInCategoryWithPattern', () => {
    test('should search files using raw srsearch pattern', async () => {
      mockMwApi.get.mockResolvedValue({
        query: {
          search: [
            { title: 'File:Chart,BLR.svg', pageid: 1, size: 1000 },
            { title: 'File:Chart,BLR_2.svg', pageid: 3, size: 2000 }
          ]
        }
      });

      const result = await service.searchInCategoryWithPattern('incategory:Belarus intitle:/^Chart/');

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('File:Chart,BLR.svg');
      expect(mockMwApi.get).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'query',
          list: 'search',
          srsearch: 'incategory:Belarus intitle:/^Chart/',
          srnamespace: 6
        })
      );
    });

    test('should handle pagination in search results', async () => {
      mockMwApi.get
        .mockResolvedValueOnce({
          query: {
            search: [
              { title: 'File:Chart1.svg', pageid: 1, size: 1000 }
            ]
          },
          continue: { sroffset: 1 }
        })
        .mockResolvedValueOnce({
          query: {
            search: [
              { title: 'File:Chart2.svg', pageid: 2, size: 2000 }
            ]
          }
        });

      const result = await service.searchInCategoryWithPattern('incategory:Test');

      expect(result).toHaveLength(2);
      expect(mockMwApi.get).toHaveBeenCalledTimes(2);
    });

    test('should handle empty search results', async () => {
      mockMwApi.get.mockResolvedValue({
        query: { search: [] }
      });

      const result = await service.searchInCategoryWithPattern('incategory:Empty');

      expect(result).toEqual([]);
    });

    test('should handle complex search patterns', async () => {
      mockMwApi.get.mockResolvedValue({
        query: { search: [] }
      });

      const complexPattern = 'incategory:Belarus intitle:/^Charts/ incategory:Maps -intitle:/draft/';
      await service.searchInCategoryWithPattern(complexPattern);

      expect(mockMwApi.get).toHaveBeenCalledWith(
        expect.objectContaining({
          srsearch: complexPattern
        })
      );
    });

    test('should use srlimit max for efficiency', async () => {
      mockMwApi.get.mockResolvedValue({
        query: { search: [] }
      });

      await service.searchInCategoryWithPattern('incategory:Test');

      expect(mockMwApi.get).toHaveBeenCalledWith(
        expect.objectContaining({
          srlimit: 'max'
        })
      );
    });

    test('should include file properties in search', async () => {
      mockMwApi.get.mockResolvedValue({
        query: { search: [] }
      });

      await service.searchInCategoryWithPattern('incategory:Test');

      expect(mockMwApi.get).toHaveBeenCalledWith(
        expect.objectContaining({
          srprop: 'size|wordcount|timestamp'
        })
      );
    });

    test('should handle API errors gracefully', async () => {
      mockMwApi.get.mockRejectedValue(new Error('Network error'));

      await expect(
        service.searchInCategoryWithPattern('incategory:Test')
      ).rejects.toThrow('Network error');
    });
  });

  describe('searchInCategory', () => {
    test('should sanitize pattern and delegate to searchInCategoryWithPattern', async () => {
      sanitizeSpy.mockReturnValue('Test');

      mockMwApi.get.mockResolvedValue({
        query: { search: [] }
      });

      await service.searchInCategory('Test Category', 'Test');

      expect(sanitizeSpy).toHaveBeenCalledWith('Test');
      expect(mockMwApi.get).toHaveBeenCalledWith(
        expect.objectContaining({
          srsearch: 'incategory:Test_Category intitle:/Test/'
        })
      );
    });

    test('should replace spaces with underscores in category name', async () => {
      global.Validator = {
        sanitizeTitlePattern: jest.fn().mockReturnValue(',BLR')
      };

      mockMwApi.get.mockResolvedValue({
        query: { search: [] }
      });

      await service.searchInCategory('Life expectancy maps', ',BLR');

      expect(mockMwApi.get).toHaveBeenCalledWith(
        expect.objectContaining({
          srsearch: 'incategory:Life_expectancy_maps intitle:/,BLR/'
        })
      );
    });
  });

  describe('fetchCategories', () => {
    test('should return empty array for short search terms', async () => {
      const result = await service.fetchCategories('a');
      expect(result).toEqual([]);
      expect(mockMwApi.get).not.toHaveBeenCalled();
    });

    test('should return empty array for empty search term', async () => {
      const result = await service.fetchCategories('');
      expect(result).toEqual([]);
      expect(mockMwApi.get).not.toHaveBeenCalled();
    });

    test('should return empty array for null search term', async () => {
      const result = await service.fetchCategories(null);
      expect(result).toEqual([]);
      expect(mockMwApi.get).not.toHaveBeenCalled();
    });

    test('should fetch categories with valid search term', async () => {
      mockMwApi.get.mockResolvedValue([
        'Category:Test',
        ['Category:Belarus', 'Category:Europe', 'Category:Maps'],
        [],
        []
      ]);

      const result = await service.fetchCategories('Bel');

      expect(result).toEqual([
        { value: 'Category:Belarus', label: 'Category:Belarus' },
        { value: 'Category:Europe', label: 'Category:Europe' },
        { value: 'Category:Maps', label: 'Category:Maps' }
      ]);
    });

    test('should use default limit of 10', async () => {
      mockMwApi.get.mockResolvedValue([
        'Category:Test',
        ['Category:Test'],
        [],
        []
      ]);

      await service.fetchCategories('Test');

      expect(mockMwApi.get).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10
        })
      );
    });

    test('should use custom limit option', async () => {
      mockMwApi.get.mockResolvedValue([
        'Category:Test',
        ['Category:Test'],
        [],
        []
      ]);

      await service.fetchCategories('Test', { limit: 20 });

      expect(mockMwApi.get).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20
        })
      );
    });

    test('should handle offset option', async () => {
      mockMwApi.get.mockResolvedValue([
        'Category:Test',
        ['Category:Test'],
        [],
        []
      ]);

      await service.fetchCategories('Test', { offset: 50 });

      expect(mockMwApi.get).toHaveBeenCalledWith(
        expect.objectContaining({
          continue: '50'
        })
      );
    });

    test('should return empty array when API returns no data[1]', async () => {
      mockMwApi.get.mockResolvedValue([
        'Category:Test',
        null,
        [],
        []
      ]);

      const result = await service.fetchCategories('Test');

      expect(result).toEqual([]);
    });

    test('should return empty array when API returns null', async () => {
      mockMwApi.get.mockResolvedValue(null);

      const result = await service.fetchCategories('Test');

      expect(result).toEqual([]);
    });
  });

  describe('searchInCategoryWithPattern - safety limit', () => {
    test('should stop at 5000 results and log warning', async () => {
      const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Create enough results to hit the limit
      const bigBatch = Array.from({ length: 100 }, (_, i) => ({
        title: `File:Test${i}.svg`,
        pageid: i,
        size: 1000
      }));

      mockMwApi.get.mockResolvedValue({
        query: {
          search: bigBatch
        },
        continue: { sroffset: 100 }
      });

      await service.searchInCategoryWithPattern('incategory:Test');

      expect(mockConsoleWarn).toHaveBeenCalledWith('Search result limit reached (5000 files)');

      mockConsoleWarn.mockRestore();
    });
  });
});
