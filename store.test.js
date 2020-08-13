const { Store } = require('store');

describe('Store', () => {
  let persistentData = {};

  // Override Get and Set methods
  Store._getPersistedProperty = function (key) {
    return persistentData[key];
  };

  Store._setPersistedProperty = function (key, value) {
    persistentData[key] = value;
  };

  describe('#register', () => {
    beforeEach(() => {
      persistentData = {};
      Store.reset();

      Store.register('mock', {
        foo: '',
        _persisted: true
      });
    });

    it('does not allow reregistration', () => {
      expect(() => {
        Store.register('mock', {
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
    beforeEach(() => {
      persistentData = {};
      Store.reset();

      Store.register('mock', {
        foo: '',
        _persisted: true
      });
    });

    it('allows saving the same value multiple times', () => {
      Store.mock.foo = 'mock string 1';
      expect(Store.mock.foo).toEqual('mock string 1');
      Store.mock.foo = 'mock string 2';
      expect(Store.mock.foo).toEqual('mock string 2');
    });

    it('saves in memory', () => {
      Store.mock.foo = 'mock string';
      expect(Store.mock.foo).toEqual('mock string');
    });

    it('saves persistent values to the persistent storage', () => {
      Store.mock.foo = 'mock string';
      expect(persistentData['mock']).toEqual({
        foo: 'mock string'
      });
    });

    it('reads sub elements from the cache', () => {
      persistentData['mock'] = {
        foo: 'mock string'
      };

      expect(Store.mock.foo).toEqual('mock string');
    });

    it('reads the top level object from the cache', () => {
      persistentData['mock'] = {
        foo: 'mock string'
      };

      expect(Store.mock).toEqual({
        _cached: true,
        _persisted: true,
        foo: 'mock string'
      });
    });

    it('does not retrieve from the cache more than once', () => {
      // We will test this by overriding the cache after the first
      //  miss and see if the value changes.
      persistentData['mock'] = {
        foo: 'mock string'
      };

      expect(Store.mock.foo).toEqual('mock string');

      persistentData['mock'] = {
        foo: 'new mock string'
      };

      expect(Store.mock.foo).toEqual('mock string');
    });

    it('non-registered persistent data is discared', () => {
      persistentData['mock'] = JSON.stringify({
        foo: 'new mock string',
        bar: 'also a new string'
      });

      expect(Store.mock.bar).toEqual(undefined);
    });

    it("registered data that is not in the data store is set to it's default", () => {
      Store.register('mockDefaultTest', {
        foo: 'deault string',
        _persisted: true
      });

      persistentData['mockDefaultTest'] = {
        bar: 'also a new string'
      };

      expect(Store.mockDefaultTest.foo).toEqual('deault string');
    });

    it('does not allow assignment if the structure does not match the registration', () => {
      expect(() => {
        Store.mock.bar = 'hello';
      }).toThrow();
    });

    it('allows array data to be retrieved from persistent storage', () => {
      persistentData['persistedReadArrayMock'] = {
        data: [1, 2, 3]
      };

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

    it('persists on assignment of the whole top level object', () => {
      Store.mock = {
        foo: 'hello foo'
      };

      expect(persistentData['mock']).toEqual({
        foo: 'hello foo'
      });
    });

    it('does not allow changing _persisted', () => {
      expect(() => {
        Store.mock = {
          foo: 'hello foo',
          _persisted: false
        };
      }).toThrow();
    });

    it('ignores any changes to _cached', () => {
      expect(() => {
        Store.mock = {
          foo: 'hello foo',
          _cached: false
        };
      }).not.toThrow();

      expect(Store.mock._cached).toEqual(true);
    });

    it('allows setting _persisted to the same value it was', () => {
      expect(() => {
        Store.mock = {
          foo: 'hello foo',
          _persisted: true
        };
      }).not.toThrow();
    });
  });

  describe('non-persistant values', () => {
    beforeEach(() => {
      persistentData = {};
      Store.reset();

      Store.register('mock', {
        foo: ''
      });
    });

    it('does not cache values when setting', () => {
      Store.mock.foo = 'mock string';
      expect(persistentData['mock']).toEqual(undefined);
    });

    it('does not try to read the cache when reading', () => {
      Store.mock.foo;
      expect(persistentData['mock']).toEqual(undefined);
    });

    it('does not allow assignment if the structure does not match the registration', () => {
      expect(() => {
        Store.mock.bar = 'hello';
      }).toThrow();
    });
  });

  describe('#clearCache', () => {
    beforeEach(() => {
      persistentData = {};
      Store.reset();

      Store.register('mock', {
        foo: '',
        _persisted: true
      });
    });

    it('clears the cache', () => {
      // To test this, let's change the localStorage data
      //   outside of the Store and then see if we retrieve
      //   the new data after clearing the cache.

      Store.mock.foo = 'mock string';
      expect(persistentData['mock']).toEqual({
        foo: 'mock string'
      });

      Store.clearCache();
      persistentData['mock'] = {
        foo: 'sneaky mock string'
      };

      expect(Store.mock.foo).toEqual('sneaky mock string');
    });
  });

  describe('#reset', () => {
    beforeEach(() => {
      persistentData = {};
      Store.reset();

      Store.register('mock', {
        foo: '',
        _persisted: true
      });
      Store.mock.foo = 'bar'; // Force update
    });

    it('removes all handlers', () => {
      Store.reset();
      expect(Store.mock).toBe(undefined);
    });

    it('removes all properties', () => {
      Store.reset();
      expect(Store._registeredHandlers['mock']).toBe(undefined);
    });

    it('does not clear any persisted data', () => {
      Store.reset();
      expect(persistentData['mock']).toEqual({
        foo: 'bar'
      });
    });
  });

  describe('#clearPersistentStorage', () => {
    beforeEach(() => {
      persistentData = {};
      Store.reset();

      Store.register('mock', {
        foo: 'testFoo'
      });

      persistentData['bar'] = 'testBar';
    });

    it('nullifies all (and only) registered keys in the storage', () => {
      Store.clearPersistentStorage();
      expect(persistentData).toEqual({
        mock: null,
        bar: 'testBar'
      });
    });
  });
});
