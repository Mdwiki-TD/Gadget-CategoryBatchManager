const { default: FileListHandler } = require('../../../src/ui/handlers/FileListHandler');

describe('FileListHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new FileListHandler();
  });

  describe('selectAll', () => {
    test('should select all files in the list', () => {
      const workFiles = [
        { title: 'File:Test1.svg', selected: false },
        { title: 'File:Test2.svg', selected: false },
        { title: 'File:Test3.svg', selected: false }
      ];

      handler.selectAll(workFiles);

      expect(workFiles[0].selected).toBe(true);
      expect(workFiles[1].selected).toBe(true);
      expect(workFiles[2].selected).toBe(true);
    });

    test('should handle empty array', () => {
      const workFiles = [];

      handler.selectAll(workFiles);

      expect(workFiles).toEqual([]);
    });

    test('should keep already selected files selected', () => {
      const workFiles = [
        { title: 'File:Test1.svg', selected: true },
        { title: 'File:Test2.svg', selected: false }
      ];

      handler.selectAll(workFiles);

      expect(workFiles[0].selected).toBe(true);
      expect(workFiles[1].selected).toBe(true);
    });
  });

  describe('deselectAll', () => {
    test('should deselect all files in the list', () => {
      const workFiles = [
        { title: 'File:Test1.svg', selected: true },
        { title: 'File:Test2.svg', selected: true },
        { title: 'File:Test3.svg', selected: true }
      ];

      handler.deselectAll(workFiles);

      expect(workFiles[0].selected).toBe(false);
      expect(workFiles[1].selected).toBe(false);
      expect(workFiles[2].selected).toBe(false);
    });

    test('should handle empty array', () => {
      const workFiles = [];

      handler.deselectAll(workFiles);

      expect(workFiles).toEqual([]);
    });

    test('should keep already deselected files deselected', () => {
      const workFiles = [
        { title: 'File:Test1.svg', selected: true },
        { title: 'File:Test2.svg', selected: false }
      ];

      handler.deselectAll(workFiles);

      expect(workFiles[0].selected).toBe(false);
      expect(workFiles[1].selected).toBe(false);
    });
  });

  describe('removeFile', () => {
    test('should remove file at valid index', () => {
      const workFiles = [
        { title: 'File:Test1.svg', selected: true },
        { title: 'File:Test2.svg', selected: false },
        { title: 'File:Test3.svg', selected: true }
      ];

      handler.removeFile(workFiles, 1);

      expect(workFiles).toHaveLength(2);
      expect(workFiles[0].title).toBe('File:Test1.svg');
      expect(workFiles[1].title).toBe('File:Test3.svg');
    });

    test('should remove first file (index 0)', () => {
      const workFiles = [
        { title: 'File:Test1.svg', selected: true },
        { title: 'File:Test2.svg', selected: false }
      ];

      handler.removeFile(workFiles, 0);

      expect(workFiles).toHaveLength(1);
      expect(workFiles[0].title).toBe('File:Test2.svg');
    });

    test('should remove last file', () => {
      const workFiles = [
        { title: 'File:Test1.svg', selected: true },
        { title: 'File:Test2.svg', selected: false }
      ];

      handler.removeFile(workFiles, 1);

      expect(workFiles).toHaveLength(1);
      expect(workFiles[0].title).toBe('File:Test1.svg');
    });

    test('should not remove file with negative index', () => {
      const workFiles = [
        { title: 'File:Test1.svg', selected: true },
        { title: 'File:Test2.svg', selected: false }
      ];

      handler.removeFile(workFiles, -1);

      expect(workFiles).toHaveLength(2);
    });

    test('should not remove file with out of bounds index', () => {
      const workFiles = [
        { title: 'File:Test1.svg', selected: true },
        { title: 'File:Test2.svg', selected: false }
      ];

      handler.removeFile(workFiles, 5);

      expect(workFiles).toHaveLength(2);
    });

    test('should handle empty array', () => {
      const workFiles = [];

      handler.removeFile(workFiles, 0);

      expect(workFiles).toEqual([]);
    });
  });
});
