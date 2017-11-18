/** @flow */

/*
 * Copyright (c) (2017)
 *
 *  Written by Aikar <aikar@aikar.co>
 *
 *  @license MIT
 *
 */

import {DefaultObjectCreator, MapObjectCreator, ObjectCreator, SetObjectCreator} from "./creators";
import type {Config, DataParameter, IJsonObject, MappingEntry} from "./index";

export class JsonObject {

  deserializedCount: number = 0;
  typeKey: string;
  id2ObjMap: Map<string, Function> = new Map();
  obj2IdMap: Map<Function, string> = new Map();
  logger: Function = console.error.bind(console, "[JsonObject]");
  objCreators: Map<string, ObjectCreator> = new Map();


  constructor(config: Config) {
    const mappings = {
      "__MAP": Map,
      "__SET": Set,
      ...(config.mappings || {})
    };
    const creators = config.creators || {};
    this.objCreators.set("__MAP", MapObjectCreator);
    this.objCreators.set("__SET", SetObjectCreator);

    if (config.errorLogger) {
      this.logger = config.errorLogger;
    }

    // $FlowFixMe
    for (const [id, obj] of (Object.entries(mappings): Array<[string, MappingEntry]>)) {
      this.id2ObjMap.set(id, obj);
      this.obj2IdMap.set(obj, id);
      let creator = creators[id] || DefaultObjectCreator;
      if (obj.ObjectCreator) {
        if (obj.ObjectCreator.createObject) {
          creator = obj.ObjectCreator;
        } else {
          this.logger("Invalid ObjectCreator defined on " + obj.name + " - must implement createObject");
        }
      }
      this.objCreators.set(id, creator);
    }

    this.typeKey = config.typeKey || ":cls";
  }

  /**
   * Asynchronously create a JSON represented object.
   *
   * Rebuilds JS Object into classes in a non recursive manner.
   * This is to avoid the risk of stack overflow issues as Timings
   * data can be very deep.
   *
   * As each data object is processed, its children are added onto the processing stack,
   * so only the root request does remapping operations.
   *
   * We build asynchronously to avoid browsers warning about long operations.
   *
   * @param data
   * @returns {*}
   */
  async deserializeObject(data: DataParameter) {
    const queue = [];
    if (Array.isArray(data)) {
      for (let i = 0; i < data.length; i++) {
        const arrData = data[i];
        data[i] = this.createObject(arrData);
      }
      await this.processQueue(queue);
      return data;
    } else {
      const obj = this.createObject(data);
      await this.processQueue(queue);
      return obj;
    }
  }

  /**
   *
   * @param {QueuedDeserialize[]} queue
   * @returns {Promise.<void>}
   */
  async processQueue(queue: Array<QueuedDeserialize>) {
    let item;
    while ((item = queue.pop())) {
      if (typeof item === 'function') {
        item();
        continue;
      }
      const thisIdx = item.idx;
      if (!item.val) {
        this.logger(item);
      }
      const thisData = item.val[thisIdx];
      if (thisData[this.typeKey]) {
        item.val[thisIdx] = this.createObject(thisData);
      } else if (typeof item.val[thisIdx] === 'object') {
        queueDeserialize(item.val[thisIdx], queue);
      }

      if (this.deserializedCount++ > 10000 && queue.length) {
        await waitFor(2);
        this.deserializedCount = 0;
      }
    }
  }

  /**
   * @param {JsonObjectBase} tpl
   * @returns {JsonObjectBase}
   */
  async _deserializeObject(tpl: IJsonObject) {
    const queue = [];
    if (tpl.onDeserialize != null) {
      queue.push(() => tpl.onDeserialize());
    }
    const promise = queueDeserialize(tpl, queue);
    await this.processQueue(queue);
    Object.defineProperty(tpl, 'deserializeObject', {
      enumerable: false,
      configurable: true,
      value: async function () {
        await promise;
        return tpl;
      }
    });
    await promise;

    return tpl;
  }

  /**
   * @param data
   * @returns {JsonObjectBase}
   */
  createObject(data: DataParameter) {
    const id = data[this.typeKey];
    const objCls = this.id2ObjMap.get(id);
    const creator = this.objCreators.get(id);

    if (typeof id !== 'undefined' && typeof objCls === 'function') {
      if (!creator || !creator.createObject) {
        this.logger("Invalid Object Creator for", id,  objCls);
        throw new Error("Invalid Object Creator for " + id);
      }

      const tpl = creator.createObject(objCls, data);
      const deferDeserializing = tpl._deferDeserializing;

      delete data[this.typeKey];
      delete tpl['_deferDeserializing'];

      Object.defineProperty(tpl, 'rawData', {
        enumerable: false,
        configurable: true,
        value: () => data
      });

      Object.defineProperty(tpl, 'deserializeObject', {
        enumerable: false,
        configurable: true,
        value: () => this._deserializeObject(tpl)
      });

      if (!deferDeserializing) {
        tpl.deserializeObject().catch(e => this.logger("Error deserializing object", e));
      }
      return tpl;
    }
    this.logger("Unknown Class Data:", id, data);
    throw new Error("Unknown class ID:" + id);
  }
}

export class JsonObjectBase implements IJsonObject {

  /* abstract - will be injected from JsonObject */
  async deserializeObject() {}

  /* abstract - will be injected from JsonObject */
  rawData() {}

  onDeserialize() {}
}

type QueuedDeserialize = Function | {idx: any, val: any};


/**
 * @param {object,object[]} obj
 * @param {QueuedDeserialize[]} queue
 */
function queueDeserialize(obj: DataParameter, queue: Array<QueuedDeserialize>) {
  return new Promise((a) => {
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        if (obj[i] && typeof obj[i] === 'object') {
          queue.push({idx: i, val: obj});
        }
      }
    } else {
      for (const [key, val] of Object.entries(obj)) {
        if (val && typeof val === 'object') {
          queue.push({idx: key, val: obj});
        }
      }
    }
    queue.push(() => a());
  });

}

function waitFor(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
