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

  ## Description

  This Store implementation is intended to allow you to share common data
  across your application without buying into a fully featured state manager.
  Furthermore, this is agnostic to which framework you are using if any.

  ## USAGE

  ### Step 1: Inclusion in your project

  #### Node

  `const { Store } = require('path/to/store');`

  #### Pure JS - no require utility or bundler

  In your HTML file add this line: `<script src="path/to/store.js"></script>`

  ### Step 2: Registration

  Since the Store is global and static, you must first register the data you 
  indent to keep and manipulate. This registration process can only happen
  once per item. This syntax for this registration is:

  `Store.register(objectName, objectDefinition)`

  * `objectName` (String) - the name of the piece of data you are storing
  * `objectDefinition` (Object) - the implementation of that piece of data
    * optional field: _persisted (Boolean) - You may include this in your
         data definition. If it is set to true, this object will be saved
         to localStorage. If it is set to false or omitted, it will not be
         saved to localStorage.
    * forbidden field: _cached - This is used internally and may not be set
    * The data included in the definition will be used at the default
    * The data format in the localStorage must match the registered data 
         formatting. All sub structures must be the same data types. If
         a field is included in the registration and it does not exist in
         the persistent storage, the default given will be used. If data
         exists in the persistent storage that is not in the registration,
         that data will be discarded.

  ### Step 3: Manipulation

  Registered fields are directly appended to the Store object. Because of this
  they can be used like any other object.

  `Store.foo` will return the registered field `foo`.

  `Store.foo = 5` will set the registered field `foo` to `5`.

  ### Examples

  #### Simple Non Persistent Data

  ```
  Store.register('foo', {
    bar: 'baz'
  });
  ```

  ```
  Store.bar = 'hello';
  Store.bar
   > hello
  // Restart process and reregister
  Store.bar
   > baz
  ```

  #### Simple Persistent Data

  ```
  Store.register('foo', {
    _persisted: true,
    bar: 'baz'
  });
  ```

  ```
  Store.bar = 'hello';
  Store.bar
   > hello
  // Restart process and reregister
  Store.bar
   > hello
  ```

*/

class Store {
  static _registeredHandlers = {};

  // Assign all of the properties from => to
  static _assignProps(to, from) {
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
        Store._assignProps(to[prop], from[prop]);
        return;
      }

      to[prop] = from[prop];
    });
  }

  // Ensure both objects have the same structure
  static _structureCheck(a0, b0) {
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
              Store._structureCheck(a[prop], b[prop]);
            }
          }
        }
      });
    });
  }

  static register(key, handler) {
    if (typeof handler !== 'object') {
      throw `Handler must be an Object. Type given: ${typeof handler}`;
    }

    // Can't register a store item more than once
    if (Store[key] !== undefined) {
      throw `Store.${key} already defined.`;
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

    const proxyHandler = {
      set(target, property, value) {
        Store._structureCheck(target[property], value);

        if (target === handler) {
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

        if (Store[key]['_persisted'] === true) {
          delete Store[key]['_cached'];
          delete Store[key]['_persisted'];
          window.localStorage.setItem(key, JSON.stringify(Store[key]));
          Store[key]['_cached'] = true;
          Store[key]['_persisted'] = true;
        }
        return true;
      },
      get(target, property) {
        if (target === handler && target['_cached'] === false && target['_persisted'] === true) {
          // Cache Miss
          if (window.localStorage.getItem(key) !== undefined) {
            Store._assignProps(target, JSON.parse(window.localStorage.getItem(key)));
          }
          target['_cached'] = true;
        }

        if (typeof target[property] === 'object' && target[property] !== null) {
          return new Proxy(target[property], proxyHandler);
        }

        return target[property];
      }
    };

    Store._registeredHandlers[key] = handler;
    Store[key] = new Proxy(handler, proxyHandler);
  }

  static clearCache() {
    // Clear out all registered key and reregister them
    Object.keys(Store._registeredHandlers).forEach(function (key) {
      delete Store[key]['_cached'];
      delete Store[key];
      Store.register(key, Store._registeredHandlers[key]);
    });
  }
}

if (typeof module !== 'undefined') {
  module.exports = { Store };
}
