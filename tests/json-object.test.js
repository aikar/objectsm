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

const mappings = {
  "test1": Test1,
  "test2": Test2,
  "test3": Test3,
  "test4": Test4,
};
const deserializer = new JsonObject({
  mappings,
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
let deserialized;
beforeAll(async () => {
  deserialized = await deserializer.deserialize(testData);
});

describe("Deserializing", () => {
  test('instanceof', function () {
    expect(deserialized instanceof Test1).toBe(true);
    expect(deserialized.foo instanceof Test2).toBe(true);
    expect(deserialized.bar instanceof Test3).toBe(true);
    expect(deserialized.bar.test4 instanceof Test4).toBe(true);
  });
  test('constructors are correct', function () {
    expect(deserialized.constructor.name).toEqual("Test1");
    expect(deserialized.foo.constructor.name).toEqual("Test2");
    expect(deserialized.bar.constructor.name).toEqual("Test3");
    expect(deserialized.bar.test4.constructor.name).toEqual("Test4");
  });
  test('values are correct', function () {
    expect(deserialized.foo.baz).toEqual("Hello");
    expect(deserialized.bar.qux).toEqual(42);
    expect(deserialized.bar.test4.hello).toEqual("world! with special");
  });
});
/*
describe("Serializing", () => {
  test("Matches original", async () => {
    const serialized = await deserializer.serialize(deserialized);
    expect(testData).toEqual(serialized);
  });
  test("Uses configured type key", async () => {
    const serializer = new JsonObject({
      mappings,
      typeKey: ":test"
    });
    const serialized = await serializer.serialize(deserialized);
    expect(Object.keys(serialized)).toContain(":test");
  });
});
*/
