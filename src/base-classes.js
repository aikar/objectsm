/** @flow */
import type {DataParameter, IJsonObject} from "./index";
import {ObjectCreator} from "./creators";
import objEntries from "object.entries";

export class JsonObjectBase implements IJsonObject {

  /* abstract - will be injected from JsonObject */
  deserializeObject = async () => {};

  /* abstract - will be injected from JsonObject */
  rawData = () => {};

  onDeserialize = () => {};
}

/**
 * Base Class that expects the constructor of the object to be executed to
 * allow populating defaults that may of been added post serialization
 *
 */
export class JsonDataModel {

  withProperties(props: {[key: string]: any}) {
    for (const [k, v] of Object.entries(props)) {
      // $FlowFixMe
      this[k] = v;
    }
  }

  static ObjectCreator = new (class JsonModelCreator extends ObjectCreator {
    createObject(objCls: Function, data: DataParameter): Promise<any> | any {
      const obj = new objCls(data);
      for (const [key, val] of objEntries(data)) {
        if (val !== void 0) { // Allow re-using models default if provided
          obj[key] = val;
        }
      }
      return obj;
    }
  })();
}
