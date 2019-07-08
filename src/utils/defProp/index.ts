/**
 * @module utils
 * @author Billow Z <billowz@hotmail.com>
 * @created Wed Jul 25 2018 15:24:47 GMT+0800 (China Standard Time)
 * @modified Wed Apr 10 2019 11:47:32 GMT+0800 (China Standard Time)
 */

//#if _TARGET !== 'es3'

export const propDescriptor = true
export const propAccessor = true
export const defProp = Object.defineProperty

/*#else

export { propDescriptor, propAccessor, defProp } from './defProp'
import { defProp } from './defProp'

//#endif */

/**
 * define property value
 * @param obj				target object
 * @param prop				property name
 * @param value				value
 * @param [enumerable=true]
 * @param [configurable=true]
 * @param [writable=true]
 */
export function defValue<V>(
	obj: any,
	prop: string,
	value: V,
	enumerable?: boolean,
	configurable?: boolean,
	writable?: boolean
): V {
	defProp(obj, prop, {
		value,
		enumerable: enumerable !== false,
		configurable: configurable !== false,
		writable: writable !== false
	})
	return value
}

/**
 * define property accessor
 * @param obj					target object
 * @param prop					property name
 * @param get					get accessor
 * @param set					set accessor
 * @param [enumerable=true]
 * @param [configurable=true]
 */
export function defAccessor(
	obj: any,
	prop: string,
	get: () => any,
	set: (v: any) => void,
	enumerable?: boolean,
	configurable?: boolean
) {
	defProp(obj, prop, {
		get,
		set,
		enumerable: enumerable !== false,
		configurable: configurable !== false
	})
}
