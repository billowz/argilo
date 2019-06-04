/**
 * @module utils
 * @author Billow Z <billowz@hotmail.com>
 * @created 2019-06-04T15:12:41.779Z+08:00
 * @modified 2019-06-04T15:12:41.779Z+08:00
 */

export const P_CTOR = 'constructor'

export const P_PROTOTYPE = 'prototype'

export const P_PROTO = '__proto__'

export const P_OWNPROP = 'hasOwnProperty'

export const T_BOOL = 'boolean'

export const T_FN = 'function'

export const T_NUM = 'number'

export const T_STRING = 'string'

export const T_UNDEF = 'undefined'

export const GLOBAL: any =
	typeof window !== T_UNDEF ? window : typeof global !== T_UNDEF ? global : typeof self !== T_UNDEF ? self : {}

export type ObjArray<T> = {
	length: number
	[Symbol.iterator](): IterableIterator<T>
}
export type IArray<T> = T[] | string | ObjArray<T>

export function EMPTY_FN() {}

export function NULL_CTOR() {}
NULL_CTOR[P_PROTOTYPE] = null
