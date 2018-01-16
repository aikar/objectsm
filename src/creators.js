/** @flow */

/*
 * Copyright (c) (2017)
 *
 *  Written by Aikar <aikar@aikar.co>
 *
 *  @license MIT
 *
 */

import type {DataParameter} from "./index";
import objEntries from "object.entries";

export class ObjectCreator {

  createObject(objCls: Function, data: DataParameter): Promise<any> | any {
    const obj = Object.create(objCls.prototype);

    for (const [key, val] of objEntries(data)) {
      obj[key] = val;
    }
    return obj;
  }

  serializeObject(objCls: Function, data: DataParameter, origData: any): {[string]: any} {
    return data;
  }

  onDeserialize(obj: any): Promise<void> | void {
    if (typeof obj.onDeserialize === 'function') {
      obj.onDeserialize();
    }
  }
}

/**
 * Standard create object from prototype and copy properties
 * @type {ObjectCreator}
 */
export const DefaultObjectCreator = new ObjectCreator();

/**
 * Used to deserialize Map objects
 * @type {{createObject: {(Function, DataParameter): any, (Function, DataParameter): any}}}
 */
export const MapObjectCreator = new (class MapObjectCreator extends ObjectCreator {
  createObject(objCls: Function, data: DataParameter): any {
    return new Map(objEntries(data));
  }
})();

/**
 * Used to deserialize Set objects
 * @type {{createObject: {(Function, DataParameter): any, (Function, DataParameter): any}}}
 */
export const SetObjectCreator = new (class SetObjectCreator extends ObjectCreator {
  createObject(objCls: Function, data: DataParameter): any {
    return new Set(data);
  }
})();

export const DateObjectCreator = new (class DateObjectCreator extends ObjectCreator {
  createObject(objCls: Function, data: DataParameter) {
    return new Date(data['date']);
  }

  serializeObject(objCls: Function, data: DataParameter, origData: any): {[string]: any} {
    return {
      date: data
    };
  }
})();
