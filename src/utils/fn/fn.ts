/**
 * @module utils
 * @author Billow Z <billowz@hotmail.com>
 * @created Mon Dec 11 2017 13:57:32 GMT+0800 (China Standard Time)
 * @modified Mon Apr 08 2019 13:26:23 GMT+0800 (China Standard Time)
 */

import { applyScope } from "./apply";

/**
 * create function by code string
 * @param body	function body
 * @param args	function argument names
 * @param name	function name
 */
export function createFn<T extends (...args: any[]) => any>(body: string, args?: string[], name?: string): T {
	return name
		? Function(`return function ${name}(${args ? args.join(', ') : ''}){${body}}`)()
		: applyScope(Function, Function, args && args.length ? args.concat(body) : [body])
}

const varGenReg = /\$\d+$/

/**
 * get function name
 */
export function fnName(fn: (...args: any[]) => any): string {
	const name: string = (fn as any).name
	return name ? name.replace(varGenReg, '') : 'anonymous'
}
