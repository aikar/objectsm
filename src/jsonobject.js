/*
 * Copyright (c) (2017)
 *
 *  Written by Aikar <aikar@aikar.co>
 *
 *  @license MIT
 *
 */

import {ArrayListMultiMap} from "./ArrayListMultiMap";

export class JsonObject {

  deseriaizedCount = 0;
  typeKey;
  id2ObjMap = new Map();
  obj2IdMap = new Map();
  logger = console.error.bind(console, "[JsonObject]");
  postProcessors = new ArrayListMultiMap();

  constructor(config) {
    const mappings = {
      "__MAP": Map,
      "__SET": Set,
      ...(config.mappings || {})
    };
    for (const [id, obj] of Object.entries(mappings)) {
      this.id2ObjMap.set(id, obj);
      this.obj2IdMap.set(obj, id);
    }
    if (config.logger) {
      this.logger = config.logger;
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
  async deserializeObject(data) {
    const queue = [];
    if (Array.isArray(data)) {
      for (let i = 0; i < data.length; i++) {
        const arrData = data[i];
        data[i] = this.createObject(arrData);
        this.initializeData(data[i], arrData, queue);
      }
      await this.processQueue(queue);
      return data;
    } else {
      const obj = this.createObject(data);
      this.initializeData(obj, data, queue);
      await this.processQueue(queue);
      return obj;
    }
  }

  /**
   *
   * @param {QueuedDeserialize[]} queue
   * @returns {Promise.<void>}
   */
  async processQueue(queue) {
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
        this.initializeData(item.val[thisIdx], thisData, queue);
      } else if (typeof item.val[thisIdx] === 'object') {
        queueDeserialize(item.val[thisIdx], queue);
      }

      if (this.deseriaizedCount++ > 10000 && queue.length) {
        await waitFor(2);
        this.deseriaizedCount = 0;
      }
    }
  }

  /**
   * @param {JsonObjectBase} tpl
   * @returns {JsonObjectBase}
   */
  async _deserializeObject(tpl) {
    const queue = [];
    if (tpl.onDeserialize != null) {
      queue.push(() => tpl.onDeserialize());
    }
    const promise = queueDeserialize(tpl, queue);
    await this.processQueue(queue);
    delete tpl['deserializeObject'];
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
   * @param {JsonObjectBase} tpl
   * @param {object} data
   * @param {QueuedDeserialize[]} queue
   */
  initializeData(tpl, data, queue) {
    // eslint-disable-next-line private-props/no-use-outside
    const deferDeserializing = tpl._deferDeserializing;

    delete tpl['_deferDeserializing'];
    delete tpl['deserializeObject'];
    delete tpl['rawData'];

    Object.defineProperty(tpl, 'rawData', {
      enumerable: false,
      configurable: true,
      value: () => data
    });

    for (const [key, val] of Object.entries(data)) {
      tpl[key] = val;
    }

    Object.defineProperty(tpl, 'deserializeObject', {
      enumerable: false,
      configurable: true,
      value: () => this._deserializeObject(tpl)
    });

    if (!deferDeserializing) {
      tpl.deserializeObject().catch(e => this.logger("Error deserializing object", e));
    }
  }

  /**
   * @param data
   * @returns {JsonObjectBase}
   */
  createObject(data) {
    const id = data[this.typeKey];
    const objCls = this.id2ObjMap.get(id);

    if (typeof id !== 'undefined' && typeof objCls === 'function') {
      /**
       * @type JsonObjectBase
       *
       */
      const tpl = new objCls();
      // How can we do this?
      //const tpl = Object.create(null, objCls);
      delete data[this.typeKey];

      return tpl;
    }
    this.logger("Unknown Class Data:", id, data);
    throw new Error("Unknown class ID:" + id);
  }
}

export default JsonObject;

export class JsonObjectBase {
  _rawData;

  async deserializeObject() { /* abstract - will be injected from JsonObject */
  }

  rawData() { /* abstract - will be injected from JsonObject */
  }

  onDeserialize() {
  }

  constructor() {
  }
}

/**
 * @param {object,object[]} obj
 * @param {QueuedDeserialize[]} queue
 */
function queueDeserialize(obj, queue) {
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

/**
 * @typedef {function,{idx: *, val: *}} QueuedDeserialize
 */
function waitFor(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
