/** @flow */

import type {DataParameter} from "./index";

export class ObjectCreator {

  createObject(objCls: Function, data: DataParameter): any {
    const tpl = Object.create(objCls.prototype);

    for (const [key, val] of Object.entries(data)) {
      tpl[key] = val;
    }
    return tpl;
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
