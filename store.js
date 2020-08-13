/* 
  The MIT License (MIT)

  Copyright (c) 2007-2018 Einar Lielmanis, Liam Newman, and contributors.

  Permission is hereby granted, free of charge, to any person
  obtaining a copy of this software and associated documentation files
  (the "Software"), to deal in the Software without restriction,
  including without limitation the rights to use, copy, modify, merge,
  publish, distribute, sublicense, and/or sell copies of the Software,
  and to permit persons to whom the Software is furnished to do so,
  subject to the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
  BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
  ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.

  See: https://github.com/officialhopsof/js-store for details on usage
*/

_Store = {
  _registeredHandlers: {},

  // Method to persist data
  _setPersistedProperty: function (key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
  },

  // Method to retrieve persisted data
  _getPersistedProperty: function (key) {
    let data = window.localStorage.getItem(key);
    if (data === null) {
      return null;
    }

    return JSON.parse(data);
  },
  _deproxy: function (proxy) {
    return JSON.parse(JSON.stringify(proxy));
  },
  _assignProps: function (to, from) {
    // Assign all of the properties from => to
    if (from === null) {
      return;
    }

    let from_props = Object.getOwnPropertyNames(from);

    from_props.forEach(prop => {
      if (typeof to === 'object' && !Array.isArray(to)) {
        if (to[prop] === undefined) {
          return; // Data was in the store that is not in the registered object - discard it
        }

        if (to[prop] !== null && from[prop] !== null && typeof to[prop] !== typeof from[prop]) {
          throw 'Persistent structure does not match registered store object structure.';
        }
      }

      if (typeof to[prop] === 'object' && to[prop] !== null) {
        _Store._assignProps(to[prop], from[prop]);
        return;
      }

      to[prop] = from[prop];
    });
  },
  _validateStructure: function (a0, b0) {
    // Ensure both objects have the same structure
    if (a0 === undefined || a0 === null || b0 === undefined || b0 === null) {
      return;
    }

    [
      [a0, b0],
      [b0, a0]
    ].forEach(function (array, index) {
      let a = array[0];
      let b = array[1];

      if (typeof a !== 'object' || typeof b !== 'object') {
        return;
      }

      let b_props = Object.getOwnPropertyNames(b);

      b_props.forEach(prop => {
        if (typeof a === 'object' && !Array.isArray(a)) {
          if (a[prop] === undefined) {
            throw 'Assignment in Store must have the same structure as the definition.';
          }

          if (a[prop] !== null && b[prop] !== null) {
            if (typeof a[prop] !== typeof b[prop]) {
              throw 'Assignment in Store must have the same structure as the definition.';
            }

            // Since we are only checking for equality of the structure,
            // we only need to perform this one time - as a minor optimization
            if (index === 0 && typeof a[prop] === 'object') {
              _Store._validateStructure(a[prop], b[prop]);
            }
          }
        }
      });
    });
  },

  _setupHandler: function (handler) {
    if (typeof handler !== 'object') {
      throw `Handler must be an Object. Type given: ${typeof handler}`;
    }

    if (handler._cached !== undefined) {
      throw `Can not register reserved store field '_cached'`;
    }
    handler._cached = false;

    // Default to not persisted (in localStorage)
    if (handler._persisted === undefined) {
      handler._persisted = false;
    } else if (handler._persisted !== true && handler._persisted !== false) {
      throw `Can not register reserved store field '_persisted' to non-boolean value`;
    }
  },

  _persist: function (key) {
    if (_Store[key]['_persisted'] === true) {
      delete _Store[key]['_cached'];
      delete _Store[key]['_persisted'];
      _Store._setPersistedProperty(key, _Store._deproxy(_Store[key]));
      _Store[key]['_cached'] = true;
      _Store[key]['_persisted'] = true;
    }
  },
  _generateProxyHandler: function (key) {
    return {
      set(target, property, value) {
        _Store._validateStructure(target[property], value);

        if (target === _Store._registeredHandlers[key]) {
          if (property === '_cached' || property === '_persisted') {
            target[property] = value;
            return true;
          }

          if (target['_persisted'] === true) {
            target['_cached'] = true;
          }
        }

        // if the target is an object and it does not already have this property
        //  defined, then it is not allowed to add it. Since arrays are objects, we
        //  need to make a special check for that.
        if (
          typeof target === 'object' &&
          !Array.isArray(target) &&
          target[property] === undefined
        ) {
          throw 'Assignment invalid - does not match registered structure.';
        }

        target[property] = value;

        _Store._persist(key);
        return true;
      },
      get(target, property) {
        if (
          target === _Store._registeredHandlers[key] &&
          target['_cached'] === false &&
          target['_persisted'] === true
        ) {
          // Cache Miss
          if (_Store._getPersistedProperty(key) !== undefined) {
            _Store._assignProps(target, _Store._getPersistedProperty(key));
          }
          target['_cached'] = true;
        }

        if (typeof target[property] === 'object' && target[property] !== null) {
          return new Proxy(target[property], _Store._generateProxyHandler(key));
        }

        return target[property];
      }
    };
  },
  register: function (key, handler) {
    // Can't register a store item more than once
    if (_Store[key] !== undefined) {
      throw `Store.${key} already defined.`;
    }

    _Store._setupHandler(handler);
    _Store._registeredHandlers[key] = handler;
    _Store[key] = new Proxy(handler, _Store._generateProxyHandler(key));
  },
  clearCache: function () {
    // Clear out all registered key and reregister them
    Object.keys(_Store._registeredHandlers).forEach(function (key) {
      delete Store[key]['_cached'];
      delete Store[key];
      _Store.register(key, _Store._registeredHandlers[key]);
    });
  },
  reset: function () {
    Object.keys(_Store._registeredHandlers).forEach(function (key) {
      delete Store[key];
      delete _Store._registeredHandlers[key];
    });
  },
  clearPersistentStorage: function () {
    Object.keys(_Store._registeredHandlers).forEach(function (key) {
      _Store._setPersistedProperty(key, null);
    });
  }
};

// Proxy the Store to allow us to directly assign top level objects
Store = new Proxy(_Store, {
  set(target, property, value) {
    if (_Store._registeredHandlers[property] === undefined) {
      target[property] = value;
    } else {
      persisted = _Store[property]['_persisted'];

      // Do not allow reassignment of _persisted
      if (value['_persisted'] !== undefined && value['_persisted'] != persisted) {
        throw `Can not reassign Store.${property}._persisted`;
      }

      // If the old value was persisted, persist it
      if (persisted) {
        value['_persisted'] = true;
        value['_cached'] = true;
        _Store[property] = value;
        _Store._persist(property);
      } else {
        _Store[property] = value;
      }
    }

    return true;
  },
  get(target, property) {
    if (_Store._registeredHandlers[property] === undefined) {
      return target[property];
    }

    return new Proxy(target[property], _Store._generateProxyHandler(property));
  }
});

if (typeof module !== 'undefined') {
  module.exports = { Store };
}
