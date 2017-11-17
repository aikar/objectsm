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

import {ObjectCreator} from "./creators";
import {JsonObject, JsonObjectBase} from "./json-object";

export type Config = {
  mappings: {[key: string]: Function & {ObjectCreator?: ObjectCreator}},
  creators?: {[key: string]: ObjectCreator},
  errorLogger?: Function,
  typeKey?: string,
}

export interface IJsonOBjectBase {
  _deferDeserializing?: boolean;
  deserializeObject(): Promise<any>;
  rawData(): any;
  onDeserialize(): any;
}

export {JsonObject, JsonObjectBase};
export default JsonObject;

export type DataParameter = {[key: string]: any} | Array<any>;
