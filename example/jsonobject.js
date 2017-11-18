/** @flow */

/*
 * Copyright (c) (2017)
 *
 *  Written by Aikar <aikar@aikar.co>
 *
 *  @license MIT
 *
 */

const JsonObject = global.devNodeUseDist ? require("../dist/index").JsonObject : require("../src/index").JsonObject;

class Test2 {
  /** @type string */
  baz;
}

class Test3 {
  /** @type int */
  qux;
}

class Test1 {
  /** @type Test2 */
  foo;
  /** @type Test3 */
  bar;
}

const test = new JsonObject({
  mappings: {
    "test1": Test1,
    "test2": Test2,
    "test3": Test3,
  }
});

async function testRun() {
  const result = await test.deserializeObject({
    ":cls": "test1",
    "foo": {
      ":cls": "test2",
      "baz": "Hello"
    },
    "bar": {
      ":cls": "test3",
      "qux": 42,
    }
  });
  console.log("got result", result instanceof Test1, result.foo instanceof Test2, result.constructor.name, result.foo.constructor.name);
}

testRun().catch(console.error);
