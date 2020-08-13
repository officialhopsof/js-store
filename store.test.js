const { Store } = require('./../../../lib/components/store');

describe(Store, () => {
  const mockWindow = function () {
    window = {
      localStorage: {
        data: {},
        setItem(key, value) {
          data[key] = value;
        },
        getItem(key) {
          return data[key];
        }
      }
    };
    return window;
  };

  describe('#register', () => {
    it('does not allow reregistration', () => {
      expect(() => {
        Store.register('nonPersistedMock', {
          foo: ''
        });
      }).toThrow();
    });

    it('throws unless the handler is an object', () => {
      expect(() => {
        Store.register('temp', 'value');
      }).toThrow();
    });

    it('allows the definition of functions for data manipulation', () => {
      Store.register('registerFuncTest', {
        data: [],
        add: function (value) {
          data = Store.registerFuncTest.data.filter(p => p != value);
          data.unshift(value);
          Store.registerFuncTest.data = data;
        }
      });
      Store.registerFuncTest.add(1);
      expect(Store.registerFuncTest.data).toEqual([1]);
      Store.registerFuncTest.add(2);
      expect(Store.registerFuncTest.data).toEqual([2, 1]);
    });

    it('does not allow registration of reserved key _cached at the top level', () => {
      expect(() => {
        Store.register('raiseOnCached', {
          _cached: true
        });
      }).toThrow();
    });

    it('does not allow registration of reserved key _persisted not being boolean', () => {
      expect(() => {
        Store.register('raiseOnPersistedNotBoolean', {
          _persisted: 'true'
        });
      }).toThrow();
    });
  });

  describe('persistent values', () => {
    Store.register('persistedMock', {
      foo: '',
      _persisted: true
    });

    beforeEach(() => {
      window = mockWindow();
      Store.clearCache();
    });

    it('allows saving the same value multiple times', () => {
      Store.persistedMock.foo = 'mock string 1';
      expect(Store.persistedMock.foo).toBe('mock string 1');
      Store.persistedMock.foo = 'mock string 2';
      expect(Store.persistedMock.foo).toBe('mock string 2');
    });

    it('saves in memory', () => {
      Store.persistedMock.foo = 'mock string';
      expect(Store.persistedMock.foo).toBe('mock string');
    });

    it('saves persistent values to the localStorage', () => {
      Store.persistedMock.foo = 'mock string';
      expect(window.localStorage.getItem('persistedMock')).toBe(
        JSON.stringify({
          foo: 'mock string'
        })
      );
    });

    it('reads from the cache', () => {
      window.localStorage.setItem(
        'persistedMock',
        JSON.stringify({
          foo: 'mock string'
        })
      );

      expect(Store.persistedMock.foo).toBe('mock string');
    });

    it('does not retrieve from the cache more than once', () => {
      // We will test this by overriding the cache after the first
      //  miss and see if the value changes.
      window.localStorage.setItem(
        'persistedMock',
        JSON.stringify({
          foo: 'mock string'
        })
      );

      expect(Store.persistedMock.foo).toBe('mock string');

      window.localStorage.setItem(
        'persistedMock',
        JSON.stringify({
          foo: 'new mock string'
        })
      );

      expect(Store.persistedMock.foo).toBe('mock string');
    });

    it('non-registered persistent data is discared', () => {
      window.localStorage.setItem(
        'persistedMock',
        JSON.stringify({
          foo: 'new mock string',
          bar: 'also a new string'
        })
      );

      expect(Store.persistedMock.bar).toBe(undefined);
    });

    it("registered data that is not in the data store is set to it's default", () => {
      window.localStorage.setItem(
        'persistedMock',
        JSON.stringify({
          bar: 'also a new string'
        })
      );

      expect(Store.persistedMock.foo).toBe('new mock string');
    });

    it('does not allow assignment if the structure does not match the registration', () => {
      expect(() => {
        Store.nonPersistedMock.bar = 'hello';
      }).toThrow();
    });

    it('allows array data to be retrieved from persistent storage', () => {
      window.localStorage.setItem(
        'persistedReadArrayMock',
        JSON.stringify({
          data: [1, 2, 3]
        })
      );

      Store.register('persistedReadArrayMock', {
        _persisted: true,
        data: []
      });

      expect(Store.persistedReadArrayMock.data).toEqual([1, 2, 3]);
    });

    it('allows array data to be saved to persistent storage', () => {
      Store.register('persistedSaveArrayMock', {
        _persisted: true,
        data: []
      });
      Store.persistedSaveArrayMock.data = [1, 2, 3];
      Store.clearCache();
      expect(Store.persistedSaveArrayMock.data).toEqual([1, 2, 3]);
    });
  });

  describe('non-persistant values', () => {
    Store.register('nonPersistedMock', {
      foo: ''
    });

    beforeEach(() => {
      window = mockWindow();
      Store.clearCache();
    });

    it('does not cache values when setting', () => {
      Store.nonPersistedMock.foo = 'mock string';
      expect(window.localStorage.getItem('nonPersistedMock')).toBe(null);
    });

    it('does not try to read the cache when reading', () => {
      Store.nonPersistedMock.foo;
      expect(window.localStorage.getItem('nonPersistedMock')).toBe(null);
    });

    it('does not allow assignment if the structure does not match the registration', () => {
      expect(() => {
        Store.nonPersistedMock.bar = 'hello';
      }).toThrow();
    });
  });

  describe('#clearCache', () => {
    beforeEach(() => {
      window = mockWindow();
      Store.clearCache();
    });

    it('clears the cache', () => {
      // To test this, let's change the localStorage data
      //   outside of the Store and then see if we retrieve
      //   the new data after clearing the cache.

      Store.persistedMock.foo = 'mock string';
      expect(window.localStorage.getItem('persistedMock')).toBe(
        JSON.stringify({
          foo: 'mock string'
        })
      );

      Store.clearCache();
      window.localStorage.setItem(
        'persistedMock',
        JSON.stringify({
          foo: 'sneaky mock string'
        })
      );

      expect(Store.persistedMock.foo).toBe('sneaky mock string');
    });
  });
});
