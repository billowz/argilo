/**
 * @module utils
 * @author Billow Z <billowz@hotmail.com>
 * @created Mon Dec 11 2017 13:57:32 GMT+0800 (China Standard Time)
 * @modified Mon Apr 08 2019 13:26:23 GMT+0800 (China Standard Time)
 */

import { GLOBAL } from '../consts'

/**
 * generate apply function
 */
function applyBuilder<T extends (...args: any[]) => any>(maxArgs: number, scope: any, offset: any): T {
	scope = scope ? 'scope' : ''
	offset = offset ? 'offset' : ''
	const args = new Array(maxArgs + 1)
	const cases = new Array(maxArgs + 1)
	for (let i = 0; i <= maxArgs; i++) {
		args[i] = `${i || scope ? ', ' : ''}args[${offset ? `offset${i ? ' + ' + i : ''}` : i}]`
		cases[i] = `case ${i}: return fn${scope && '.call'}(${scope}${args.slice(0, i).join('')});`
	}
	return Function(`return function(fn, ${scope && scope + ', '}args${offset && ', offset, len'}){
switch(${offset ? 'len' : 'args.length'}){
${cases.join('\n')}
}
${offset &&
	`var arr = new Array(len);
for(var i=0; i<len; i++) arr[i] = args[offset + i];`}
return fn.apply(${scope || 'undefined'}, ${offset ? 'arr' : 'args'});
}`)()
}

/**
 * apply function with scope
 * @param fn	target function
 * @param scope	scope of function
 * @param args	arguments of function
 */
export const applyScope: (fn: (...args: any[]) => any, scope: any, args: any[] | IArguments) => any = applyBuilder(
	8,
	1,
	0
)

/**
 * apply function without scope
 * @param fn		target function
 * @param args	arguments of function
 */
export const applyNoScope: (fn: (...args: any[]) => any, args: any[] | IArguments) => any = applyBuilder(8, 0, 0)

/**
 * apply function with scope
 * @param fn		target function
 * @param scope		scope of function
 * @param args		arguments of function
 * @param offset	start offset of args
 * @param len		arg size from offset
 */
export const applyScopeN: (
	fn: (...args: any[]) => any,
	scope: any,
	args: any[] | IArguments,
	offset: number,
	len: number
) => any = applyBuilder(8, 1, 1)

/**
 * apply function without scope
 * @param fn		target function
 * @param args		arguments of function
 * @param offset	start offset of args
 * @param len		arg size from offset
 */
export const applyNoScopeN: (
	fn: (...args: any[]) => any,
	args: any[] | IArguments,
	offset: number,
	len: number
) => any = applyBuilder(8, 0, 1)

/**
 * apply function
 * @param fn		target function
 * @param scope		scope of function
 * @param args		arguments of function
 */
export function apply(fn: (...args: any[]) => any, scope: any, args: any[] | IArguments): any {
	if (scope === undefined || scope === null || scope === GLOBAL) {
		return applyNoScope(fn, args || [])
	}
	return applyScope(fn, scope, args || [])
}

/**
 * apply function
 * @param fn		target function
 * @param scope		scope of function
 * @param args		arguments of function
 * @param offset	start offset of args
 * @param len		arg size from offset
 */
export function applyN(
	fn: (...args: any[]) => any,
	scope: any,
	args: any[] | IArguments,
	offset: number,
	len: number
): any {
	if (scope === undefined || scope === null || scope === GLOBAL) {
		return applyNoScopeN(fn, args, offset, len)
	}
	return applyScopeN(fn, scope, args, offset, len)
}
