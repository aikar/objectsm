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
    const entries = (Object.entries(mappings): any);
    for (const [id, obj] of (entries: Array<[string, MappingEntry]>)) {
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
        data[i] = await this.createObject(arrData, queue);
      }
      await this.processQueue(queue);
      return data;
    } else {
      const obj = await this.createObject(data, queue);
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
        await Promise.resolve(item());
        continue;
      }
      const thisIdx = item.idx;
      const thisData = item.val[thisIdx];
      if (thisData[this.typeKey]) {
        item.val[thisIdx] = await this.createObject(thisData, queue);
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
   * @param {JsonObjectBase} obj
   * @param creator
   * @param queue
   * @returns {JsonObjectBase}
   */
  async _deserializeObject(obj: IJsonObject, creator: ObjectCreator, queue: Array<QueuedDeserialize>) {

    queueDeserialize(obj, queue);
    queue.push(async () => await Promise.resolve(creator.onDeserialize(obj)));
    const promise = this.processQueue(queue);

    Object.defineProperty(obj, 'deserializeObject', {
      enumerable: false,
      configurable: true,
      value: async function (): Promise<any> {
        await promise;
        return obj;
      }
    });
    await promise;

    return obj;
  }

  /**
   * @param data
   * @param queue
   * @returns {JsonObjectBase}
   */
  async createObject(data: DataParameter, queue: Array<QueuedDeserialize>) {
    const id = data[this.typeKey];
    const objCls = this.id2ObjMap.get(id);
    const creator = this.objCreators.get(id);

    if (typeof id !== 'undefined' && typeof objCls === 'function') {
      if (!creator || !creator.createObject) {
        this.logger("Invalid Object Creator for", id,  objCls);
        throw new Error("Invalid Object Creator for " + id);
      }

      const obj = await Promise.resolve(creator.createObject(objCls, data));
      const deferDeserializing = obj._deferDeserializing;

      delete data[this.typeKey];
      delete obj['_deferDeserializing'];

      Object.defineProperty(obj, 'rawData', {
        enumerable: false,
        configurable: true,
        value: () => data
      });

      if (!deferDeserializing) {
        this._deserializeObject(obj, creator, queue);
      } else {
        Object.defineProperty(obj, 'deserializeObject', {
          enumerable: false,
          configurable: true,
          value: async () => this._deserializeObject(obj, creator, [])
        });
      }
      return obj;
    }
    this.logger("Unknown Class Data:", id, data);
    throw new Error("Unknown class ID:" + id);
  }
}

export class JsonObjectBase implements IJsonObject {

  /* abstract - will be injected from JsonObject */
  deserializeObject = async () => {};

  /* abstract - will be injected from JsonObject */
  rawData = () => {};

  onDeserialize = () => {};
}

type QueuedDeserialize = Function | {idx: any, val: any};


/**
 * @param {object,object[]} obj
 * @param {QueuedDeserialize[]} queue
 */
function queueDeserialize(obj: DataParameter, queue: Array<QueuedDeserialize>) {
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
}

function waitFor(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
