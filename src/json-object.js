/** @flow */

/*
 * Copyright (c) (2017)
 *
 *  Written by Aikar <aikar@aikar.co>
 *
 *  @license MIT
 *
 */
import "regenerator-runtime/runtime";
import objEntries from "object.entries";
import {DefaultObjectCreator, MapObjectCreator, ObjectCreator, SetObjectCreator} from "./creators";
import type {Config, DataParameter, IJsonObject, MappingEntry} from "./index";
import clone from "clone";
import toJson from "object-tojson";

export class JsonObject {

  config: Config;
  typeKey: string;
  id2ObjMap: Map<string, Function> = new Map();
  obj2IdMap: Map<Function, string> = new Map();
  logger: Function = console.error.bind(console, "[JsonObject]");
  objCreators: Map<string, ObjectCreator> = new Map();


  constructor(config: Config) {
    this.config = config;
    const mappings = {
      "__MAP": Map,
      "__SET": Set,
      ...(config.mappings || {})
    };
    this.objCreators.set("__MAP", MapObjectCreator);
    this.objCreators.set("__SET", SetObjectCreator);

    if (config.errorLogger) {
      this.logger = config.errorLogger;
    }

    // $FlowFixMe
    const entries = (objEntries(mappings): any);
    for (const [id, obj] of (entries: Array<[string, MappingEntry]>)) {
      this.addMapping(id, obj);
    }

    this.typeKey = config.typeKey || ":cls";
  }

  hasMapping(id: string): boolean {
    return this.objCreators.has(id);
  }

  addMapping(id: string, obj: MappingEntry): void {
    this.id2ObjMap.set(id, obj);
    this.obj2IdMap.set(obj, id);
    const creators = this.config.creators || {};
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
  async deserialize(data: DataParameter) {
    let obj = clone(data);
    const queue = [];
    if (Array.isArray(data)) {
      for (let i = 0; i < data.length; i++) {
        if (typeof data[i] === 'object') {
          obj[i] = await this.createObject(obj[i], queue);
          this.queueObject(data[i], queue, this.deserializeItem);
        }
      }
    } else {
      obj = await this.createObject(obj, queue);
      this.queueObject(obj, queue, this.deserializeItem);
    }

    await this.processQueue(queue);
    return obj;
  }

  /**
   *
   * @param queue
   * @returns {Promise.<void>}
   */
  async processQueue(queue: Array<Function>) {
    let item;
    while ((item = queue.pop())) {
      const promise = item();
      if (promise && promise.then) {
        await promise;
      }
    }
  }

  async serialize(data: DataParameter): Promise<any> {
    const json = toJson(data);
    this.serializeItem(json, data);
    return json;
  }

  /**
   * @param {JsonObjectBase} obj
   * @param creator
   * @returns {JsonObjectBase}
   */
  async _deserializeObject(obj: IJsonObject, creator: ObjectCreator) {
    const queue = [];
    this.queueObject(obj, queue, this.deserializeItem);
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
  async createObject(data: any, queue: Array<Function>) {
    const id = String(data[this.typeKey]);
    const objCls = this.id2ObjMap.get(id);
    const creator = this.objCreators.get(id);

    if (typeof id !== 'undefined' && typeof objCls === 'function') {
      if (!creator || !creator.createObject) {
        this.logger("Invalid Object Creator for", id,  objCls);
        throw new Error("Invalid Object Creator for " + id);
      }
      delete data[this.typeKey];

      const obj = await Promise.resolve(creator.createObject(objCls, data));
      const deferDeserializing = obj._deferDeserializing;

      delete obj['_deferDeserializing'];

      Object.defineProperty(obj, 'rawData', {
        enumerable: false,
        configurable: true,
        value: () => data
      });

      if (!deferDeserializing) {
        queue.push(() => this._deserializeObject(obj, creator));
      } else {
        Object.defineProperty(obj, 'deserializeObject', {
          enumerable: false,
          configurable: true,
          value: () => this._deserializeObject(obj, creator)
        });
      }
      return obj;
    }
    this.logger("Unknown Class Data:", id, data);
    throw new Error("Unknown class ID:" + id);
  }

  async deserializeItem(val: any, idx: string, queue: Array<Function>) {
    const thisData = val[idx];
    if (thisData[this.typeKey]) {
      val[idx] = await this.createObject(thisData, queue);
    } else if (typeof val[idx] === 'object') {
      this.queueObject(val[idx], queue, this.deserializeItem);
    }
  }

  serializeItem(data: any, origVal: any) {
    if (typeof data === 'object') {
      if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          this.serializeItem(data[i], origVal[i]);
        }
      } else {
        const id = this.obj2IdMap.get(origVal.constructor);

        for (const [key, val] of objEntries(data)) {
          this.serializeItem(val, origVal[key]);
        }

        if (id) {
          data[this.typeKey] = id;
          const creator = this.objCreators.get(id) || DefaultObjectCreator;
          creator.serializeObject(origVal.constructor, data);
        }
      }
    }
  }

  /**
   * @param {object,object[]} obj
   * @param queue
   * @param func
   */
  queueObject(obj: DataParameter, queue: Array<Function>, func: Function) {
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        if (typeof obj[i] === 'object') {
          queue.push(func.bind(this, obj, i, queue));
        }
      }
    } else {
      for (const [key, val] of objEntries(obj)) {
        if (val && typeof val === 'object') {
          queue.push(func.bind(this, obj, key, queue));
        }
      }
    }
  }
}

export class JsonObjectBase implements IJsonObject {

  /* abstract - will be injected from JsonObject */
  deserializeObject = async () => {};

  /* abstract - will be injected from JsonObject */
  rawData = () => {};

  onDeserialize = () => {};
}

