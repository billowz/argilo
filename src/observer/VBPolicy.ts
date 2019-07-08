/**
 * Observe implementation on the VBScript of MSIE
 * @module observer
 * @author Billow Z <billowz@hotmail.com>
 * @created Tue Mar 19 2019 14:12:23 GMT+0800 (China Standard Time)
 * @modified Wed Apr 24 2019 19:36:45 GMT+0800 (China Standard Time)
 */
import { ObserverTarget, IWatcher, IObserver } from './IObserver'
import { ObservePolicy } from './ObservePolicy'
import { GLOBAL, P_CTOR, P_OWNPROP } from '../utils/consts'
import { create, isFn, getDKeys, addDKeys } from '../utils'
import { applyArrayHooks } from './arrayHook'

declare function execScript(code: string, type: string): void
declare function parseVB(code: string): void

export default function vbPolicy(): ObservePolicy {
	if (GLOBAL.VBArray) {
		try {
			execScript(['Function parseVB(code)', '\tExecuteGlobal(code)', 'End Function'].join('\n'), 'VBScript')

			addDKeys(VBPROXY_KEY, VBPROXY_CTOR_KEY, 'toJSON')

			return {
				__name: 'VBProxy',
				__proxy: 'vb',
				__createProxy<T extends ObserverTarget>(observer: IObserver<T>, target: T, isArray: boolean): T {
					return isArray ? (applyArrayHooks(target as any[]), target) : new VBProxy(target, observer).__proxy
				},
				__watch<T extends ObserverTarget>(observer: IObserver<T>, prop: string, watcher: IWatcher): Error {
					if (!observer.isArray && !(observer.target as any)[VBPROXY_KEY].__props[prop]) {
						return new Error(`property[${prop}] is not defined`)
					}
				}
			}
		} catch (e) {
			console.error(e.message, e)
		}
	}
}

function mkToJSON(source: any) {
	if (!source.toJSON)
		source.toJSON = function() {
			return source
		}
}
export class VBProxy<T extends {}> {
	private readonly source: T
	/**
	 * function property map
	 * 	- key: property name
	 * 	- value: [scoped function, original function]
	 */
	private readonly __fns: { [name: string]: [Function, Function] }
	readonly __props: { [prop: string]: boolean }
	private readonly __observer: IObserver<T>
	readonly __proxy: T

	constructor(source: T, observer: IObserver<T>) {
		const props = [],
			propMap: { [prop: string]: boolean } = create(null),
			__fns: string[] = [],
			fns: { [prop: string]: [Function, Function] } = create(null)
		let prop: string,
			i = 0,
			j = 0

		mkToJSON(source)
		for (prop in source) {
			if (!isKey(prop)) {
				propMap[prop] = true
				props[i++] = prop
				if (isFn((source as any)[prop])) __fns[j++] = prop
			}
		}
		applyProps(props, propMap, OBJECT_DEFAULT_PROPS)
		applyProps(props, propMap, getDKeys())
		const proxy = createVBClass(props, this)

		while (j--) {
			prop = __fns[j]
			fns[prop] = [, (source as any)[prop]]
		}

		this.source = source
		this.__observer = observer
		this.__proxy = proxy
		this.__fns = fns
		this.__props = propMap
		;(source as any)[VBPROXY_KEY] = this
	}

	set(prop: string, value: any) {
		const { source, __fns: fns } = this
		if (isFn(value)) {
			fns[prop] = [, value]
		} else if (fns[prop]) {
			fns[prop] = null
		}
		this.__observer.notify(prop, (source as any)[prop])
		;(source as any)[prop] = value
	}

	get(prop: string) {
		const fn = this.__fns[prop]
		return fn ? fn[0] || (fn[0] = fn[1].bind(this.__proxy)) : (this.source as any)[prop]
	}
	toJSON() {}
}

function applyProps(props: string[], propMap: { [key: string]: boolean }, applyProps: string[]) {
	let i = applyProps.length,
		j = props.length,
		prop: string
	while (i--) {
		prop = applyProps[i]
		if (!isKey(prop) && propMap[prop] !== true) {
			propMap[prop] = true
			props[j++] = prop
		}
	}
}
function isKey(prop: string) {
	return prop === VBPROXY_KEY || prop === VBPROXY_CTOR_KEY
}

export const VBPROXY_KEY = '__vbclass_binding__',
	VBPROXY_CTOR_KEY = '__vbclass_constructor__',
	OBJECT_DEFAULT_PROPS = [
		P_CTOR,
		P_OWNPROP,
		'isPrototypeOf',
		'propertyIsEnumerable',
		'toLocaleString',
		'toString',
		'valueOf',
		'toJSON'
	]

const CONSTRUCTOR_SCRIPT = `
	Public [${VBPROXY_KEY}]
	Public Default Function [${VBPROXY_CTOR_KEY}](source)
		Set [${VBPROXY_KEY}] = source
		Set [${VBPROXY_CTOR_KEY}] = Me
	End Function
	`,
	classPool = create(null)

function genAccessorScript(prop: string): string {
	return `
	Public Property Let [${prop}](value)
		Call [${VBPROXY_KEY}].set("${prop}", value)
	End Property
	Public Property Set [${prop}](value)
		Call [${VBPROXY_KEY}].set("${prop}", value)
	End Property

	Public Property Get [${prop}]
	On Error Resume Next
		Set [${prop}] = [${VBPROXY_KEY}].get("${prop}")
	If Err.Number <> 0 Then
		[${prop}] = [${VBPROXY_KEY}].get("${prop}")
	End If
	On Error Goto 0
	End Property

`
}

function genClassScript(className: string, props: string[]): string {
	const buffer = ['Class ' + className, CONSTRUCTOR_SCRIPT],
		l = props.length
	let i = 0
	for (; i < l; i++) buffer[i + 3] = genAccessorScript(props[i])
	buffer[i + 3] = 'End Class'
	return buffer.join('\n')
}

let classNameGenerator = 1
function createVBClass<T extends {}>(props: string[], desc: VBProxy<T>): T {
	const classKey = props.sort().join('|')
	let factoryName = classPool[classKey]
	if (!factoryName) {
		const className = `VBClass${classNameGenerator++}`
		factoryName = `${className}Factory`

		// build VB Class
		parseVB(genClassScript(className, props))

		parseVB(`
Function ${factoryName}(desc)
	Dim o
	Set o=(New ${className})(desc)
	Set ${factoryName} = o
End Function`)

		classPool[classKey] = factoryName
	}
	return GLOBAL[factoryName](desc)
}
