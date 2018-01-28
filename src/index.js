/** @flow */

/*
 * Copyright (c) (2017)
 *
 *  Written by Aikar <aikar@aikar.co>
 *
 *  @license MIT
 *
 */

import {ObjectCreator} from "./creators";
import {ObjectManager} from "./object-manager";
import {ObjectBase, DataModel} from "./base-classes";

export type MappingEntry = (Class<any> | Function) & $Shape<{name: string, ObjectCreator: ObjectCreator}>;
export type Config = {
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

export {ObjectManager, ObjectBase, DataModel, ObjectCreator};
export default ObjectManager;

export type DataParameter = {[key: string]: any};
export type DataParameterArray = Array<DataParameter | any>
