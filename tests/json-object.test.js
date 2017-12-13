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
    async createObject(objCls: Function, data: DataParameter): Promise<any> | any {
      const obj = await Promise.resolve(super.createObject(objCls, data));
      obj.hello += " with special";
      return obj;
    }

    serializeObject(objCls: Function, data: DataParameter, origValue: any): {[string]: any} {
      data = super.serializeObject(objCls, data);
      // $FlowFixMe
      data.hello = data.hello.replace(/ with special/, '');
      return data;
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
};
const deserializer = new JsonObject({
  mappings,
});
deserializer.addMapping("test4", Test4);

const testFoo = [
  {
    ":cls": "test2",
    "baz": "Hello1",
    "qux": null,
  },
  {
    ":cls": "test2",
    "baz": "Hello2"
  }];
const testData = {
  ":cls": "test1",
  "foo": testFoo,
  "bar": {
    ":cls": "test3",
    "qux": 42,
    "date": {":cls": "__DATE", "date": "2017-01-01T00:10:00.000Z"},
    "test4": {
      ":cls": "test4",
      "hello": "world!"
    }
  }
};
const orig = JSON.parse(JSON.stringify(testData));
let deserialized;
beforeAll(async () => {
  deserialized = await deserializer.deserialize(testData);
});

describe("Deserializing", () => {
  test('instanceof', function () {
    expect(deserialized).toBeInstanceOf(Test1);
    expect(deserialized.foo).toBeInstanceOf(Array);
    expect(deserialized.foo[0]).toBeInstanceOf(Test2);
    expect(deserialized.foo[1]).toBeInstanceOf(Test2);
    expect(deserialized.bar).toBeInstanceOf(Test3);
    expect(deserialized.bar.test4).toBeInstanceOf(Test4);
  });
  test('Constructors are correct', function () {
    expect(deserialized.constructor.name).toEqual("Test1");
    expect(deserialized.foo[0].constructor.name).toEqual("Test2");
    expect(deserialized.foo[1].constructor.name).toEqual("Test2");
    expect(deserialized.bar.constructor.name).toEqual("Test3");
    expect(deserialized.bar.test4.constructor.name).toEqual("Test4");
  });
  test('Values are correct', function () {
    expect(deserialized.foo[0].baz).toEqual("Hello1");
    expect(deserialized.foo[1].baz).toEqual("Hello2");
    expect(deserialized.bar.qux).toEqual(42);
    expect(deserialized.bar.test4.hello).toEqual("world! with special");
  });
  test("deserializing root array", async () => {
    const arr = await deserializer.deserialize(testFoo);
    expect(arr[0]).toBeInstanceOf(Test2);
    expect(arr[1]).toBeInstanceOf(Test2);
    expect(arr[0].baz).toEqual("Hello1");
    expect(arr[1].baz).toEqual("Hello2");
  });
  test("Deserialize doesn't mutate original data", () => {
    expect(testData).toEqual(orig);
  });
});

describe("Serializing", () => {
  test("Matches original", async () => {
    const serialized = await deserializer.serialize(deserialized);
    expect(serialized).toEqual(testData);
  });
  test("Uses configured type key", async () => {
    const serializer = new JsonObject({
      mappings,
      typeKey: ":test"
    });
    const serialized = await serializer.serialize(deserialized);
    expect(Object.keys(serialized)).toContain(":test");
  });
  test("input with functions", async () => {
    const obj = {
      test: 1,
      foo() {

      },
      bar: () => {

      },
      baz: "42"
    };
    const result = await deserializer.serialize(obj);
    expect(result).toEqual({test: 1, baz: "42"});
  });
});

