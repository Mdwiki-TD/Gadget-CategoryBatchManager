const { default: RateLimiter } = require('../../src/utils/RateLimiter');

describe('RateLimiter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('wait', () => {
    test('should wait for default 2000ms when no argument provided', async () => {
      const limiter = new RateLimiter();
      const waitPromise = limiter.wait();

      jest.advanceTimersByTime(2000);
      await expect(waitPromise).resolves.toBeUndefined();
    });

    test('should wait for custom duration when ms is provided', async () => {
      const limiter = new RateLimiter();
      const waitPromise = limiter.wait(5000);

      jest.advanceTimersByTime(5000);
      await expect(waitPromise).resolves.toBeUndefined();
    });

    test('should return immediately when ms is 0', async () => {
      const limiter = new RateLimiter();
      const waitPromise = limiter.wait(0);

      await expect(waitPromise).resolves.toBeUndefined();
    });

    test('should return immediately when ms is null', async () => {
      const limiter = new RateLimiter();
      const waitPromise = limiter.wait(null);

      await expect(waitPromise).resolves.toBeUndefined();
    });

    test('should return immediately when ms is undefined', async () => {
      const limiter = new RateLimiter();
      const waitPromise = limiter.wait(undefined);

      jest.advanceTimersByTime(2000);
      await expect(waitPromise).resolves.toBeUndefined();
    });

    test('should handle multiple sequential waits', async () => {
      const limiter = new RateLimiter();
      const promises = [
        limiter.wait(100),
        limiter.wait(200),
        limiter.wait(300)
      ];

      jest.advanceTimersByTime(300);
      await Promise.all(promises.map(p => expect(p).resolves.toBeUndefined()));
    });
  });

  describe('throttle', () => {
    test('should wait for delay then execute function', async () => {
      const fn = jest.fn(() => 'result');
      const throttlePromise = RateLimiter.throttle(fn, 1000);

      jest.advanceTimersByTime(1000);
      await expect(throttlePromise).resolves.toBe('result');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('should pass return value from function', async () => {
      const fn = jest.fn(() => 42);
      const throttlePromise = RateLimiter.throttle(fn, 500);

      jest.advanceTimersByTime(500);
      await expect(throttlePromise).resolves.toBe(42);
    });

    test('should handle async functions', async () => {
      const fn = jest.fn(async () => 'async result');
      const throttlePromise = RateLimiter.throttle(fn, 300);

      jest.advanceTimersByTime(300);
      await expect(throttlePromise).resolves.toBe('async result');
    });

    test('should handle function that throws error', async () => {
      const fn = jest.fn(() => {
        throw new Error('Test error');
      });
      const throttlePromise = RateLimiter.throttle(fn, 100);

      jest.advanceTimersByTime(100);
      await expect(throttlePromise).rejects.toThrow('Test error');
    });

    test('should handle zero delay', async () => {
      const fn = jest.fn(() => 'immediate');
      const throttlePromise = RateLimiter.throttle(fn, 0);

      // Even with 0 delay, setTimeout needs to run
      jest.advanceTimersByTime(0);
      await expect(throttlePromise).resolves.toBe('immediate');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('batch', () => {
    test('should process items in batches', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = jest.fn(x => x * 2);

      const results = await RateLimiter.batch(items, 2, processor);

      expect(results).toEqual([2, 4, 6, 8, 10]);
      expect(processor).toHaveBeenCalledTimes(5);
    });

    test('should handle empty items array', async () => {
      const processor = jest.fn();

      const results = await RateLimiter.batch([], 3, processor);

      expect(results).toEqual([]);
      expect(processor).not.toHaveBeenCalled();
    });

    test('should handle single item', async () => {
      const items = [1];
      const processor = jest.fn(x => x + 1);

      const results = await RateLimiter.batch(items, 5, processor);

      expect(results).toEqual([2]);
      // Array.map passes (item, index, array) to the callback
      expect(processor).toHaveBeenCalledWith(1, 0, [1]);
    });

    test('should handle batch size larger than items array', async () => {
      const items = [1, 2];
      const processor = jest.fn(x => x.toString());

      const results = await RateLimiter.batch(items, 10, processor);

      expect(results).toEqual(['1', '2']);
      expect(processor).toHaveBeenCalledTimes(2);
    });

    test('should handle batch size of 1', async () => {
      const items = [1, 2, 3];
      const processor = jest.fn(x => x);

      const results = await RateLimiter.batch(items, 1, processor);

      expect(results).toEqual([1, 2, 3]);
      expect(processor).toHaveBeenCalledTimes(3);
    });

    test('should handle async processor function', async () => {
      const items = [1, 2, 3];
      const processor = jest.fn(async x => {
        return new Promise(resolve => setTimeout(() => resolve(x * 3), 10));
      });

      jest.useRealTimers();
      const results = await RateLimiter.batch(items, 2, processor);

      expect(results).toEqual([3, 6, 9]);
      expect(processor).toHaveBeenCalledTimes(3);
    });

    test('should handle uneven batch sizes', async () => {
      const items = [1, 2, 3, 4, 5, 6, 7];
      const processor = jest.fn(x => x);

      const results = await RateLimiter.batch(items, 3, processor);

      expect(results).toEqual([1, 2, 3, 4, 5, 6, 7]);
      // Should process 3 batches: [1,2,3], [4,5,6], [7]
      expect(processor).toHaveBeenCalledTimes(7);
    });

    test('should preserve order of results', async () => {
      const items = ['a', 'b', 'c', 'd'];
      const processor = jest.fn(x => x.toUpperCase());

      const results = await RateLimiter.batch(items, 2, processor);

      expect(results).toEqual(['A', 'B', 'C', 'D']);
    });

    test('should handle processor that throws error in one batch item', async () => {
      const items = [1, 2, 3];
      const processor = jest.fn(x => {
        if (x === 2) throw new Error('Failed on 2');
        return x;
      });

      await expect(RateLimiter.batch(items, 2, processor)).rejects.toThrow('Failed on 2');
    });
  });
});
