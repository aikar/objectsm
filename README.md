# jsonobject
![Build Status](https://travis-ci.org/aikar/json-object.svg?branch=master)
![npm version](https://img.shields.io/npm/v//jsonobject.svg) 
![Downloads](https://img.shields.io/npm/dt/jsonobject.svg)
[![GitHub issues](https://img.shields.io/github/issues/aikar/json-object.svg)](https://github.com/aikar/json-object/issues)
[![GitHub license](https://img.shields.io/github/license/aikar/json-object.svg)](https://github.com/aikar/json-object/blob/master/LICENSE)

JSON Object Serializer/Deserializer to convert raw JS objects back into class/constructor form

This library lets you define models as JavaScript classes, complete with methods/defaults and ability to post process the data.

This library will recursively iterate a JS object and automatically replace all references with their original class form,
letting you deserialize back into the original objects that actually created it.

# Install
```bash
npm install jsonobject
```

## Usage
```javascript
import JsonObject, {JsonObjectBase} from "jsonobject";
class Test2 extends JsonObjectBase {
  baz: string;
}
class Test4 extends JsonObjectBase {
  hello: string;
}

class Test3 extends JsonObjectBase {
  qux: number;
  test4: Test4;
}

class Test1 extends JsonObjectBase {
  foo: Test2;
  bar: Test3;
}

const testJson = new JsonObject({
  mappings: {
    "test1": Test1,
    "test2": Test2,
    "test3": Test3,
    "test4": Test4,
  }
});

async function test() {
  const obj = await testJson.deserializeObject({
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
JsonObjectBase is optional, but it will expose `.rawData()` and allow lazy deserializing with `.deserializeObject()`
