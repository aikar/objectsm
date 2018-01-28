# JS Object Serialization Manager
[![Build Status](https://travis-ci.org/aikar/objectsm.svg?branch=master)](https://travis-ci.org/aikar/objectsm)
[![npm version](https://img.shields.io/npm/v//objectsm.svg)](https://www.npmjs.org/package/objectsm)
[![Downloads](https://img.shields.io/npm/dt/objectsm.svg)](https://www.npmjs.org/package/objectsm)
[![GitHub issues](https://img.shields.io/github/issues/aikar/objectsm.svg)](https://github.com/aikar/objectsm/issues)
[![GitHub license](https://img.shields.io/github/license/aikar/objectsm.svg)](https://github.com/aikar/objectsm/blob/master/LICENSE)
[![Greenkeeper badge](https://badges.greenkeeper.io/aikar/objectsm.svg)](https://greenkeeper.io/)

JS Object Serializer/Deserializer Manager to convert JS objects with saved metadata back into instances of the class they were created with.
This library intends to behave like PHP serialize/deserialize does.

This library lets you define models as JavaScript classes, complete with methods/defaults and ability to post process the data.

This library will recursively iterate a JS object and automatically replace all references with their original class form,
letting you deserialize back into the original objects that actually created it.

# Install
```bash
npm install objectsm
```

## Usage
```javascript
import ObjectManager, {ObjectBase} from "objectsm";
class Test2 extends ObjectBase {
  baz: string;
}
class Test4 extends ObjectBase {
  hello: string;
}

class Test3 extends ObjectBase {
  qux: number;
  test4: Test4;
}

class Test1 extends ObjectBase {
  foo: Test2;
  bar: Test3;
}

const testManager = new ObjectManager({
  mappings: {
    "test1": Test1,
    "test2": Test2,
    "test3": Test3,
    "test4": Test4,
  }
});

async function test() {
  const obj = await testManager.deserializeObject({
    ":cls": "test1",
    "foo": {
      ":cls": "test2",
      "baz": "Hello"
    },
    "bar": {
      ":cls": "test3",
      "qux": 42,
      "test4": {
        ":cls": "test4",
        "hello": "world!"
      }
    }
  });
  console.log(obj.bar.test4 instanceof Test4); // true
}
```
ObjectBase is optional, but it will expose `.rawData()` and allow lazy deserializing with `.deserializeObject()`
