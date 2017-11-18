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

export class ObjectCreator {

  createObject(objCls: Function, data: DataParameter): Promise<any> | any {
    const obj = Object.create(objCls.prototype);

    for (const [key, val] of Object.entries(data)) {
      obj[key] = val;
    }
    return obj;
  }
  onDeserialize(obj: any): Promise<void> | void {}
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
export const MapObjectCreator = new (class extends ObjectCreator {
  createObject(objCls: Function, data: DataParameter): any {
    return new Map(Object.entries(data));
  }
})();

/**
 * Used to deserialize Set objects
 * @type {{createObject: {(Function, DataParameter): any, (Function, DataParameter): any}}}
 */
export const SetObjectCreator = new (class extends ObjectCreator {
  createObject(objCls: Function, data: DataParameter): any {
    return new Set(data);
  }
})();
