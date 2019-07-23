/**
 * @module utils
 * @author Billow Z <billowz@hotmail.com>
 * @created Mon Dec 11 2017 13:57:32 GMT+0800 (China Standard Time)
 * @modified Mon Apr 08 2019 13:26:23 GMT+0800 (China Standard Time)
 */

import { P_PROTOTYPE } from '../../consts'
import { bind } from './bind'
import { apply, applyN, applyScope } from '../apply'

let _bind: <T extends (...args: any[]) => any>(fn: T, scope: any, ...args: any[]) => T

const funcProto = Function[P_PROTOTYPE]
if (funcProto.bind) {
	_bind = bind
} else {
	console.log("polyfill Function.bind")
	funcProto.bind = function bind(scope) {
		return bindPolyfill(this as any, scope, arguments, 1)
	}
	_bind = function bind<T extends (...args: any[]) => any>(fn: T, scope: any): T {
		return bindPolyfill(fn, scope, arguments, 2)
	}
}
export { _bind as bind }

/**
 * bind
 * > not bind scope when scope is null or undefined
 * @param fn		source function
 * @param scope		bind scope
 * @param args		bind arguments
 * @param argOffset	offset of args
 * @return function proxy
 */
function bindPolyfill<T extends (...args: any[]) => any>(
	fn: T,
	scope: any,
	bindArgs: any[] | IArguments,
	argOffset: number
): T {
	const argLen = bindArgs.length - argOffset

	if (scope === null) scope = undefined

	if (argLen > 0) {
		// bind with arguments
		return function() {
			const args = arguments
			let i = args.length
			if (i) {
				const params = new Array(argLen + i)
				while (i--) {
					params[argLen + i] = args[i]
				}
				i = argLen
				while (i--) {
					params[i] = bindArgs[i + argOffset]
				}
				return apply(fn, scope === undefined ? this : scope, params) // call with scope or this
			}
			return applyN(fn, scope === undefined ? this : scope, bindArgs, argOffset, argLen) // call with scope or this
		} as any
	}

	return scope === undefined
		? fn
		: (function() {
				return applyScope(fn, scope, arguments)
		  } as any)
}
