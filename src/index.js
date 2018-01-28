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
import clone from "clone";
import toJson from "object-tojson";

import {ObjectBase, DataModel} from "./base-classes";
import {DateObjectCreator, DefaultObjectCreator, MapObjectCreator, ObjectCreator, SetObjectCreator} from "./creators";

export type MappingEntry = (Class<any> | Function) & $Shape<{name: string, ObjectCreator: ObjectCreator}>;
export type ObjectManagerConfig = {
  mappings?: {[key: string]: MappingEntry},
  creators?: {[key: string]: ObjectCreator},
  errorLogger?: Function,
  typeKey?: string,
  errorOnUnknownType?: boolean
}

export interface IObjectBase {
  _deferDeserializing?: boolean;
  deserializeObject: () => Promise<any>;
  rawData: () => any;
}

export {ObjectBase, DataModel, ObjectCreator};

export type DataParameter = {[key: string]: any};
export type DataParameterArray = Array<DataParameter | any>;


export class ObjectManager {

  config: ObjectManagerConfig;
  typeKey: string;
  id2ObjMap: Map<string, Function> = new Map();
  obj2IdMap: Map<Function, string> = new Map();
  logger: Function = console.error.bind(console, "[JSObjectManager]");
  objCreators: Map<string, ObjectCreator> = new Map();
  errorOnUnknownType: boolean;


  constructor(config: ObjectManagerConfig) {
    this.config = config;
    const mappings = {
      "__MAP": Map,
      "__SET": Set,
      "__DATE": Date,
      ...(config.mappings || {})
    };
    this.objCreators.set("__MAP", MapObjectCreator);
    this.objCreators.set("__SET", SetObjectCreator);
    this.objCreators.set("__DATE", DateObjectCreator);

    if (config.errorLogger) {
      this.logger = config.errorLogger;
    }

    // $FlowFixMe
    const entries = (objEntries(mappings): any);
    for (const [id, obj] of (entries: Array<[string, MappingEntry]>)) {
      this.addMapping(id, obj);
    }

    this.typeKey = config.typeKey || ":cls";
    this.errorOnUnknownType = Boolean(config.errorOnUnknownType);
  }

  hasMapping(id: Function | string): boolean {
    if (typeof id === 'string') {
      return this.id2ObjMap.has(id);
    } else {
      return this.obj2IdMap.has(id);
    }
  }

  addMapping(id: string, obj: MappingEntry): void {
    this.id2ObjMap.set(id, obj);
    this.obj2IdMap.set(obj, id);
    const creators = this.config.creators || {};
    let creator = creators[id] || this.objCreators.get(id) || DefaultObjectCreator;
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
  async deserialize(data: DataParameter | DataParameterArray) {
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

  async serialize(data: DataParameter | DataParameterArray): Promise<any> {
    const json = toJson(data);
    this.serializeItem(json, data);
    return json;
  }

  /**
   * @param {ObjectBase} obj
   * @param creator
   * @returns {ObjectBase}
   */
  async _deserializeObject(obj: IObjectBase, creator: ObjectCreator) {
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
   * @returns {ObjectBase}
   */
  async createObject(data: any, queue: Array<Function>) {
    if (data[this.typeKey] == null) {
      return data;
    }
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
    if (this.errorOnUnknownType) {
      this.logger("Unknown Class Data:", id, data);
      throw new Error("Unknown class ID:" + id);
    }
    return data;
  }

  async deserializeItem(val: any, idx: string, queue: Array<Function>) {
    if (val[idx][this.typeKey]) {
      val[idx] = await this.createObject(val[idx], queue);
    } else if (typeof val[idx] === 'object') {
      this.queueObject(val[idx], queue, this.deserializeItem);
    }
  }

  serializeItem(data: any, origVal: any) {

    if (origVal != null && typeof origVal === 'object') {
      const id = this.obj2IdMap.get(origVal.constructor);
      if (id) {
        const creator = this.objCreators.get(id) || DefaultObjectCreator;
        data = creator.serializeObject(origVal.constructor, data, origVal) || data || {};
        data[this.typeKey] = id;
      }
      if (data == null || typeof data !== 'object') {
        return data;
      }

      if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          data[i] = this.serializeItem(data[i], origVal[i]);
        }
      } else {
        for (const [key, val] of objEntries(data)) {
          data[key] = this.serializeItem(val, origVal[key]);
        }
      }
    }
    return data;

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
export default ObjectManager;
