# js-store

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
