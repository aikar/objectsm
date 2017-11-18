/** @flow */
/*
 * Copyright (c) (2017)
 *
 *  Written by Aikar <aikar@aikar.co>
 *
 *  @license MIT
 *
 */
import {JsonObject, JsonObjectBase, ObjectCreator} from "../src/index";
import type {DataParameter} from "../src";

class Test2 extends JsonObjectBase {
  baz: string;
}
class Test4 extends JsonObjectBase {
  hello: string;
  static ObjectCreator = new (class extends ObjectCreator {
    createObject(objCls: Function, data: DataParameter): Promise<any> | any {
      const obj = super.createObject(objCls, data);
      obj.hello += " with special";
      return obj;
    }
  })();
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
const testData = {
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
};

test('Deserializes', async function testRun() {
  const result = await testJson.deserializeObject(testData);
  expect(result instanceof Test1).toBe(true);
  expect(result.foo instanceof Test2).toBe(true);
  expect(result.bar instanceof Test3).toBe(true);
  expect(result.bar.test4 instanceof Test4).toBe(true);
  expect(result.bar.test4.hello).toEqual("world! with special");
  expect(result.constructor.name).toEqual("Test1");
  expect(result.foo.constructor.name).toEqual("Test2");
  expect(result.bar.constructor.name).toEqual("Test3");
  expect(result.bar.test4.constructor.name).toEqual("Test4");
});
