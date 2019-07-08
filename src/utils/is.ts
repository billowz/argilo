/**
 * @module utils
 * @author Billow Z <billowz@hotmail.com>
 * @created Mon Dec 11 2017 13:57:32 GMT+0800 (China Standard Time)
 * @modified Tue Apr 23 2019 17:11:05 GMT+0800 (China Standard Time)
 */

import { P_CTOR, GLOBAL, T_BOOL, T_FN, T_NUM, T_STRING } from './consts'
import { getCtor } from './ctor'
import { toStr } from './toStr'

/**
 * is equals
 * > obj === target || NaN === NaN
 * @param obj		The object to test
 * @param target 	the compare object
 */
export function eq(obj: any, target: any): boolean {
	return obj === target || (obj !== obj && target !== target)
}

//========================================================================================
/*                                                                                      *
 *                                    primitive type                                    *
 *                                                                                      */
//========================================================================================

/**
 * is null
 * @param obj 	The object to test
 */
export function isNull(obj: any): boolean {
	return obj === null
}

/**
 * is undefined
 * @param obj 	The object to test
 */
export function isUndef(obj: any): boolean {
	return obj === undefined
}

/**
 * is null or undefined
 * @param obj 	The object to test
 */
export function isNil(obj: any): boolean {
	return obj === null || obj === undefined
}

function mkIsPrimitive(type: string): (obj: any) => boolean {
	return function is(obj: any): boolean {
		return typeof obj === type
	}
}

/**
 * is boolean
 * @param obj 	The object to test
 */
export const isBool: (obj: any) => boolean = mkIsPrimitive(T_BOOL)

/**
 * is a number
 * @param obj 	The object to test
 */
export const isNum: (obj: any) => boolean = mkIsPrimitive(T_NUM)

/**
 * is a string
 * @param obj 	The object to test
 */
export const isStr: (obj: any) => boolean = mkIsPrimitive(T_STRING)

/**
 * is a function
 * @param obj 	The object to test
 */
export const isFn: (obj: any) => boolean = mkIsPrimitive(T_FN)

/**
 * is integer number
 * @param obj 	The object to test
 */
export function isInt(obj: any): boolean {
	return obj === 0 || (obj ? typeof obj === T_NUM && obj % 1 === 0 : false)
}

/**
 * is primitive type
 * - null
 * - undefined
 * - boolean
 * - number
 * - string
 * - function
 * @param obj 	The object to test
 */
export function isPrimitive(obj: any): boolean {
	if (!obj) return true
	switch (typeof obj) {
		case T_BOOL:
		case T_NUM:
		case T_STRING:
		case T_FN:
			return true
	}
	return false
}

//========================================================================================
/*                                                                                      *
 *                                    reference type                                    *
 *                                                                                      */
//========================================================================================

/**
 * is instanceof
 * @param obj 	The object to test
 * @param Ctr 	Function to test against
 */
export function instOf(obj: any, Ctr: Function): boolean {
	return obj !== undefined && obj !== null && obj instanceof Ctr
}

/**
 * is child instance of Type
 * @param obj 	The object to test
 * @param Ctr 	Function or Function[] to test against
 */
export function is(obj: any, Ctr: Function | Function[]): boolean {
	if (obj !== undefined && obj !== null) {
		const C = obj[P_CTOR] || Object
		if (Ctr[P_CTOR] === Array) {
			var i = Ctr.length
			while (i--) {
				if (C === (Ctr as Function[])[i]) {
					return true
				}
			}
		} else {
			return C === Ctr
		}
	}
	return false
}

function mkIs(Type: Function): (obj: any) => boolean {
	return function is(obj: any): boolean {
		return obj !== undefined && obj !== null && obj[P_CTOR] === Type
	}
}

/**
 * is boolean or Boolean
 * @param obj 	The object to test
 */
export const isBoolean: (obj: any) => boolean = mkIs(Boolean)

/**
 * is number or Number
 * @param obj 	The object to test
 */
export const isNumber: (obj: any) => boolean = mkIs(Number)

/**
 * is string or String
 * @param obj 	The object to test
 */
export const isString: (obj: any) => boolean = mkIs(String)

/**
 * is Date
 * @param obj 	The object to test
 */
export const isDate: (obj: any) => boolean = mkIs(Date)

/**
 * is RegExp
 * @param obj 	The object to test
 */
export const isReg: (obj: any) => boolean = mkIs(RegExp)

/**
 * is Array
 * @param obj 	The object to test
 */
export const isArray: (obj: any) => boolean = Array.isArray || mkIs(Array)

/**
 * is Typed Array
 * @param obj 	The object to test
 */
export const isTypedArray: (obj: any) => boolean = typeof ArrayBuffer === T_FN ? ArrayBuffer.isView : () => false

/**
 * is Array or pseudo-array
 * - Array
 * - String
 * - IArguments
 * - NodeList
 * - HTMLCollection
 * - Typed Array
 * - {length: int, [length-1]: any}
 * @param obj 	The object to test
 */
export function isArrayLike(obj: any): boolean {
	if (obj && obj[P_CTOR]) {
		switch (obj[P_CTOR]) {
			case Array:
			case String:
			case GLOBAL.NodeList:
			case GLOBAL.HTMLCollection:
			case GLOBAL.Int8Array:
			case GLOBAL.Uint8Array:
			case GLOBAL.Int16Array:
			case GLOBAL.Uint16Array:
			case GLOBAL.Int32Array:
			case GLOBAL.Uint32Array:
			case GLOBAL.Float32Array:
			case GLOBAL.Float64Array:
				return true
		}
		const len = obj.length
		return typeof len === T_NUM && (len === 0 || (len > 0 && len % 1 === 0 && len - 1 in obj))
	}
	return obj === ''
}

/**
 * is simple Object
 * TODO object may has constructor property
 * @param obj 	The object to test
 */
export function isObj(obj: any): boolean {
	return obj !== undefined && obj !== null && getCtor(obj) === Object
}

/**
 * is simple Object
 * @param obj 	The object to test
 */
export function isObject(obj: any): boolean {
	return toStr(obj) === '[object Object]'
}

const blankStrReg = /^\s*$/
/**
 * is empty
 * - string: trim(string).length === 0
 * - array: array.length === 0
 * - pseudo-array: pseudo-array.length === 0
 * @param obj 	The object to test
 */
export function isBlank(obj: any): boolean {
	if (obj) {
		if (obj[P_CTOR] === String) {
			return blankStrReg.test(obj)
		}
		return obj.length === 0
	}
	return true
}
