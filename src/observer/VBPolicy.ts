/**
 * Observe implementation on the VBScript of MSIE
 * @module observer
 * @author Billow Z <billowz@hotmail.com>
 * @created Tue Mar 19 2019 14:12:23 GMT+0800 (China Standard Time)
 * @modified Wed Apr 24 2019 19:36:45 GMT+0800 (China Standard Time)
 */
import { ObserverTarget, IObserver } from './IObserver'
import { ObservePolicy, IWatcher } from './ObservePolicy'
import { GLOBAL, P_CTOR, P_OWNPROP, NULL_CTOR } from '../utils/consts'
import { isFn, getDKeys, addDKeys } from '../utils'
import { applyArrayHooks } from './arrayHook'
import { assert } from '../assert'

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
	if (source.toJSON) {
		assert.fn(source.toJSON, '.toJSON is not a function')
	} else {
		source.toJSON = function() {
			return source
		}
	}
}

export const VBPROXY_KEY = '__vbclass_binding__',
	VBPROXY_CTOR_KEY = '__vbclass_constructor__',
	OBJECT_DEFAULT_METHODS = [
		P_CTOR,
		P_OWNPROP,
		'isPrototypeOf',
		'propertyIsEnumerable',
		'toLocaleString',
		'toString',
		'valueOf'
	]

enum PropType {
	PROPERTY = 1,
	FUNCTION = 2
}

let dkeys: string[]
export class VBProxy<T extends {}> {
	private readonly source: T
	private readonly __props: { [prop: string]: PropType }
	private readonly __observer: IObserver<T>
	readonly __proxy: T

	constructor(source: T, observer: IObserver<T>) {
		const props: string[] = [],
			fns: string[] = [],
			propMap: { [prop: string]: PropType } = new (NULL_CTOR as any)()

		mkToJSON(source)

		let prop: string
		for (prop in source) {
			applyProp(source, prop, props, fns, propMap)
		}

		applyProps(source, props, fns, propMap, OBJECT_DEFAULT_METHODS)
		applyProps(source, props, fns, propMap, dkeys || (dkeys = getDKeys()))

		const proxy = createVBClass(props, fns, this)

		let i = fns.length
		while (i--) {
			;(proxy as any)[fns[i]] = (source as any)[fns[i]]
		}

		this.source = source
		this.__observer = observer
		this.__proxy = proxy
		this.__props = propMap
		;(source as any)[VBPROXY_KEY] = this
	}

	set(prop: string, value: any) {
		const { source, __props: props } = this

		if (props[prop] == PropType.FUNCTION) {
			;(this.__proxy as any)[prop] = value
		}
		this.__observer.notify(prop, (source as any)[prop])
		;(source as any)[prop] = value
	}

	get(prop: string) {
		return (this.source as any)[prop]
	}

	toJSON() {}
}

function applyProps(
	source: any,
	props: string[],
	fns: string[],
	propMap: { [key: string]: PropType },
	applyProps: string[]
) {
	let i = applyProps.length,
		prop: string
	while (i--) {
		prop = applyProps[i]
		!(propMap[prop] & 3) && applyProp(source, prop, props, fns, propMap)
	}
}

function applyProp(source: any, prop: string, props: string[], fns: string[], propMap: { [key: string]: PropType }) {
	const fn = source[prop]
	if (isFn(fn)) {
		propMap[prop] = PropType.FUNCTION
		fns.push(prop)
	} else {
		propMap[prop] = PropType.PROPERTY
		props.push(prop)
	}
}

const classPool = new (NULL_CTOR as any)(),
	CONSTRUCTOR_SCRIPT = `
	Public [${VBPROXY_KEY}]
	Public Default Function [${VBPROXY_CTOR_KEY}](source)
		Set [${VBPROXY_KEY}] = source
		Set [${VBPROXY_CTOR_KEY}] = Me
	End Function
`

function genPropScript(prop: string): string {
	return `
	Public Property Let [${prop}](value)
		Call [${VBPROXY_KEY}].set("${prop}", value)
	End Property

	Public Property Get [${prop}]
		[${prop}] = [${VBPROXY_KEY}].get("${prop}")
	End Property

`
}

function genMethodScript(method: string): string {
	return `
	Public [${method}]

`
}

function genClassScript(className: string, props: string[], fns: string[]): string {
	const buffer = ['Class ' + className, CONSTRUCTOR_SCRIPT]
	let i = props.length,
		j = buffer.length

	while (i--) {
		if (props[i] !== VBPROXY_KEY && props[i] !== VBPROXY_CTOR_KEY) {
			buffer[j++] = genPropScript(props[i])
		}
	}
	i = fns.length
	while (i--) {
		buffer[j++] = genMethodScript(fns[i])
	}
	buffer[j] = 'End Class'
	return buffer.join('\n')
}

let classNameGenerator = 1
function createVBClass<T extends {}>(props: string[], fns: string[], desc: VBProxy<T>): T {
	const classKey = props.sort().join('|') + '##' + fns.sort().join('')
	let factoryName = classPool[classKey]
	if (!factoryName) {
		const className = `VBClass${classNameGenerator++}`
		factoryName = `${className}Factory`

		// build VB Class
		parseVB(genClassScript(className, props, fns))

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
