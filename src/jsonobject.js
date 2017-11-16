/** @flow */
/*
/*
 * Copyright (c) (2017)
 *
 *  Written by Aikar <aikar@aikar.co>
 *
 *  @license MIT
 *
 */

export type Config = {
  mappings: {[key: string]: Class<any>},
  creators?: {[key: string]: ObjectCreator<any>},
  logger?: Function,
  typeKey?: string,
}

export class ObjectCreator {
  objCls: Class<T>;

  constructor(objCls: Class<any>) {
    this.objCls = objCls;
  }

  createObject(data: DataParameter): any {
    const tpl = Object.create(this.objCls.prototype);

    for (const [key, val] of Object.entries(data)) {
      tpl[key] = val;
    }
    return tpl;
  }
}
const MapObjectCreator = new (class extends ObjectCreator {
  createObject(data: DataParameter): any {
    return new Map(Object.entries(data));
  }
})();
const SetObjectCreator = new (class extends ObjectCreator {
  createObject(data: DataParameter): any {
    return new Set(data);
  }
})();

export class JsonObject {

  deseriaizedCount: number = 0;
  typeKey: string;
  id2ObjMap: Map<string, Class<any>> = new Map();
  obj2IdMap: Map<Class<any>, string> = new Map();
  logger: Function = console.error.bind(console, "[JsonObject]");
  objCreators: Map<Class<any>, ObjectCreator<any>> = new Map();


  constructor(config: Config) {
    const mappings = {
      "__MAP": Map,
      "__SET": Set,
      ...(config.mappings || {})
    };
    const creators = config.creators || {};
    this.objCreators.set("__MAP", MapObjectCreator);
    this.objCreators.set("__SET", SetObjectCreator);

    for (const [id, obj] of Object.entries(mappings)) {
      this.id2ObjMap.set(id, obj);
      this.obj2IdMap.set(obj, id);
      this.objCreators.set(id, creators[id] || obj.ObjectCreator || new ObjectCreator(obj));
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
  async _deserializeObject(tpl: IJsonOBjectBase) {
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

      const tpl = creator.createObject(data);

      // eslint-disable-next-line private-props/no-use-outside
      const deferDeserializing = tpl._deferDeserializing;

      delete data[this.typeKey];
      delete tpl['_deferDeserializing'];
      delete tpl['deserializeObject'];
      delete tpl['rawData'];

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

export default JsonObject;

export interface IJsonOBjectBase {
  _deferDeserializing?: boolean;
  deserializeObject(): Promise<any>;
  rawData(): any;
  onDeserialize(): any;
}

export class JsonObjectBase implements IJsonOBjectBase {

  /* abstract - will be injected from JsonObject */
  async deserializeObject() {}

  /* abstract - will be injected from JsonObject */
  rawData() {}

  onDeserialize() {}
}

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
export type DataParameter = {[key: string]: any} | Array<any>;
type QueuedDeserialize = Function | {idx: any, val: any};

function waitFor(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
