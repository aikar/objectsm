/** @flow */
/*
 * Copyright (c) (2017)
 *
 *  Written by Aikar <aikar@aikar.co>
 *
 *  @license MIT
 *
 */

export class ArrayListMultiMap<K, V> {
  // noinspection JSUnresolvedVariable
  _backingMap: Map<K, V[]> = new Map();

  // noinspection JSUnresolvedVariable
  has(key: K): boolean {
    return this._backingMap.has(key);
  }

  // noinspection JSUnresolvedVariable
  get(key: K): V[] {
    return this._backingMap.get(key) || [];
  }

  // noinspection JSUnresolvedVariable
  set(key: K, val: V) {
    const arr = this._backingMap.get(key);
    if (arr) {
      arr.push(val);
    } else {
      this._backingMap.set(key, [val]);
    }
    return this;
  }

  // noinspection JSUnresolvedVariable
  push(key: K, val: V) {
    return this.set(key, val);
  }

  // noinspection JSUnresolvedVariable
  clear(key: K): boolean {
    return this._backingMap.delete(key);
  }
}
