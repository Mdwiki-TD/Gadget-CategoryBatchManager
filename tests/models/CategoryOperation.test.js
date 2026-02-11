const { default: CategoryOperation } = require('../../src/models/CategoryOperation');

describe('CategoryOperation', () => {
    describe('constructor', () => {
        test('should create instance with all parameters', () => {
            const data = {
                sourceCategory: 'Test Category',
                searchPattern: 'test.*',
                titlePattern: '{{.*}}',
                files: [
                    { title: 'File:Test1.svg', categories: ['Cat1', 'Cat2'] },
                    { title: 'File:Test2.svg', categories: ['Cat1'] }
                ],
                categoriesToAdd: ['New Category'],
                categoriesToRemove: ['Old Category'],
                status: 'running'
            };

            const operation = new CategoryOperation(data);

            expect(operation.sourceCategory).toBe('Test Category');
            expect(operation.searchPattern).toBe('test.*');
            expect(operation.titlePattern).toBe('{{.*}}');
            expect(operation.files).toEqual(data.files);
            expect(operation.categoriesToAdd).toEqual(['New Category']);
            expect(operation.categoriesToRemove).toEqual(['Old Category']);
            expect(operation.status).toBe('running');
        });

        test('should create instance with minimal parameters', () => {
            const data = {
                sourceCategory: 'Test Category',
                searchPattern: 'test',
                titlePattern: ''
            };

            const operation = new CategoryOperation(data);

            expect(operation.sourceCategory).toBe('Test Category');
            expect(operation.searchPattern).toBe('test');
            expect(operation.titlePattern).toBe('');
            expect(operation.files).toEqual([]);
            expect(operation.categoriesToAdd).toEqual([]);
            expect(operation.categoriesToRemove).toEqual([]);
            expect(operation.status).toBe('idle');
        });

        test('should use default values for arrays', () => {
            const data = {
                sourceCategory: 'Test',
                searchPattern: '.*',
                titlePattern: ''
            };

            const operation = new CategoryOperation(data);

            expect(operation.files).toEqual([]);
            expect(operation.categoriesToAdd).toEqual([]);
            expect(operation.categoriesToRemove).toEqual([]);
            expect(Array.isArray(operation.files)).toBe(true);
            expect(Array.isArray(operation.categoriesToAdd)).toBe(true);
            expect(Array.isArray(operation.categoriesToRemove)).toBe(true);
        });

        test('should use default status', () => {
            const data = {
                sourceCategory: 'Test',
                searchPattern: '.*',
                titlePattern: ''
            };

            const operation = new CategoryOperation(data);

            expect(operation.status).toBe('idle');
        });

        test('should accept empty arrays', () => {
            const data = {
                sourceCategory: 'Test',
                searchPattern: '.*',
                titlePattern: '',
                files: [],
                categoriesToAdd: [],
                categoriesToRemove: []
            };

            const operation = new CategoryOperation(data);

            expect(operation.files).toEqual([]);
            expect(operation.categoriesToAdd).toEqual([]);
            expect(operation.categoriesToRemove).toEqual([]);
        });

        test('should handle multiple categories to add', () => {
            const data = {
                sourceCategory: 'Test',
                searchPattern: '.*',
                titlePattern: '',
                categoriesToAdd: ['Cat1', 'Cat2', 'Cat3']
            };

            const operation = new CategoryOperation(data);

            expect(operation.categoriesToAdd).toHaveLength(3);
            expect(operation.categoriesToAdd).toContain('Cat1');
            expect(operation.categoriesToAdd).toContain('Cat2');
            expect(operation.categoriesToAdd).toContain('Cat3');
        });

        test('should handle multiple categories to remove', () => {
            const data = {
                sourceCategory: 'Test',
                searchPattern: '.*',
                titlePattern: '',
                categoriesToRemove: ['Old1', 'Old2', 'Old3']
            };

            const operation = new CategoryOperation(data);

            expect(operation.categoriesToRemove).toHaveLength(3);
            expect(operation.categoriesToRemove).toContain('Old1');
            expect(operation.categoriesToRemove).toContain('Old2');
            expect(operation.categoriesToRemove).toContain('Old3');
        });

        test('should handle different status values', () => {
            const statuses = ['idle', 'running', 'completed', 'error'];

            statuses.forEach(status => {
                const operation = new CategoryOperation({
                    sourceCategory: 'Test',
                    searchPattern: '.*',
                    titlePattern: '',
                    status
                });

                expect(operation.status).toBe(status);
            });
        });

        test('should handle files with category data', () => {
            const files = [
                {
                    title: 'File:Example.svg',
                    categories: ['Category:Images', 'Category:SVG']
                },
                {
                    title: 'File:Another.png',
                    categories: ['Category:PNG']
                }
            ];

            const operation = new CategoryOperation({
                sourceCategory: 'Test',
                searchPattern: '.*',
                titlePattern: '',
                files
            });

            expect(operation.files).toHaveLength(2);
            expect(operation.files[0].title).toBe('File:Example.svg');
            expect(operation.files[0].categories).toEqual(['Category:Images', 'Category:SVG']);
            expect(operation.files[1].title).toBe('File:Another.png');
        });

        test('should not modify input data', () => {
            const data = {
                sourceCategory: 'Test',
                searchPattern: '.*',
                titlePattern: '',
                files: [{ title: 'File:Test.svg' }],
                categoriesToAdd: ['New'],
                categoriesToRemove: ['Old'],
                status: 'pending'
            };

            const originalFiles = [...data.files];
            const originalToAdd = [...data.categoriesToAdd];

            const operation = new CategoryOperation(data);

            // Verify original data wasn't modified
            expect(data.files).toEqual(originalFiles);
            expect(data.categoriesToAdd).toEqual(originalToAdd);
        });
    });

    describe('property assignments', () => {
        test('should store sourceCategory correctly', () => {
            const operation = new CategoryOperation({
                sourceCategory: 'Our World in Data',
                searchPattern: '.*',
                titlePattern: ''
            });

            expect(operation.sourceCategory).toBe('Our World in Data');
        });

        test('should store searchPattern correctly', () => {
            const operation = new CategoryOperation({
                sourceCategory: 'Test',
                searchPattern: 'OWID.*chart',
                titlePattern: ''
            });

            expect(operation.searchPattern).toBe('OWID.*chart');
        });

        test('should store titlePattern correctly', () => {
            const operation = new CategoryOperation({
                sourceCategory: 'Test',
                searchPattern: '.*',
                titlePattern: '\\[\\[.*\\]\\]'
            });

            expect(operation.titlePattern).toBe('\\[\\[.*\\]\\]');
        });
    });

    describe('edge cases', () => {
        test('should handle empty string patterns', () => {
            const operation = new CategoryOperation({
                sourceCategory: 'Test',
                searchPattern: '',
                titlePattern: ''
            });

            expect(operation.searchPattern).toBe('');
            expect(operation.titlePattern).toBe('');
        });

        test('should handle special characters in category names', () => {
            const operation = new CategoryOperation({
                sourceCategory: 'Category:Test (2024)',
                searchPattern: '.*',
                titlePattern: '',
                categoriesToAdd: ['Category:Test & Demo'],
                categoriesToRemove: ['Category:Old/Test']
            });

            expect(operation.sourceCategory).toBe('Category:Test (2024)');
            expect(operation.categoriesToAdd).toContain('Category:Test & Demo');
            expect(operation.categoriesToRemove).toContain('Category:Old/Test');
        });

        test('should handle unicode characters', () => {
            const operation = new CategoryOperation({
                sourceCategory: 'الفئة:اختبار',
                searchPattern: '.*',
                titlePattern: '',
                categoriesToAdd: ['Категория:Тест']
            });

            expect(operation.sourceCategory).toBe('الفئة:اختبار');
            expect(operation.categoriesToAdd).toContain('Категория:Тест');
        });

        test('should handle category names with underscores', () => {
            const operation = new CategoryOperation({
                sourceCategory: 'Our_World_in_Data',
                searchPattern: '.*',
                titlePattern: '',
                categoriesToAdd: ['New_Category_Test']
            });

            expect(operation.sourceCategory).toBe('Our_World_in_Data');
            expect(operation.categoriesToAdd).toContain('New_Category_Test');
        });

        test('should handle category names with spaces', () => {
            const operation = new CategoryOperation({
                sourceCategory: 'Our World in Data',
                searchPattern: '.*',
                titlePattern: '',
                categoriesToAdd: ['New Category Test']
            });

            expect(operation.sourceCategory).toBe('Our World in Data');
            expect(operation.categoriesToAdd).toContain('New Category Test');
        });

        test('should handle long file lists', () => {
            const files = Array.from({ length: 1000 }, (_, i) => ({
                title: `File:Test${i}.svg`,
                categories: [`Category:Group${Math.floor(i / 100)}`]
            }));

            const operation = new CategoryOperation({
                sourceCategory: 'Test',
                searchPattern: '.*',
                titlePattern: '',
                files
            });

            expect(operation.files).toHaveLength(1000);
            expect(operation.files[999].title).toBe('File:Test999.svg');
        });
    });
});
