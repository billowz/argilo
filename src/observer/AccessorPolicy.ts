/**
 * Observe implementation on the Object.defineProperty of ES5 or `__defineGetter__` and `__defineSetter__`
 * @module observer
 * @author Billow Z <billowz@hotmail.com>
 * @created Tue Mar 19 2019 14:12:23 GMT+0800 (China Standard Time)
 * @modified Tue Apr 23 2019 18:13:32 GMT+0800 (China Standard Time)
 */

import { IObserver, ARRAY_CHANGE, ObserverTarget, ARRAY_LENGTH } from './IObserver'
import { ObservePolicy, IWatcher } from './ObservePolicy'
import { propAccessor, defAccessor } from '../utils'
import { applyArrayHooks } from './arrayHook'

/**
 * @ignore
 */
export default function accessorPolicy(): ObservePolicy {
	if (propAccessor)
		return {
			__name: 'Accessor',
			__createProxy<T extends ObserverTarget>(observer: IObserver<T>, target: T, isArray: boolean): T {
				isArray && applyArrayHooks(target as any[])
				return target
			},
			__watch<T extends ObserverTarget>(observer: IObserver<T>, prop: string, watcher: IWatcher): Error {
				const target: any = observer.target
				let setter: (newValue: any) => void
				if (!observer.isArray) {
					setter = (newValue: any) => {
						watcher.notify(value)
						value = newValue
					}
				} else if (prop !== ARRAY_CHANGE && prop !== ARRAY_LENGTH) {
					if (prop >= target[ARRAY_LENGTH]) {
						return new Error(`index[${prop}] is not defined`)
					}
					setter = (newValue: any) => {
						watcher.notify(value)
						observer.notify(ARRAY_CHANGE, target)
						value = newValue
					}
				} else {
					return
				}
				var value: any = target[prop]
				try {
					defAccessor(target, prop, () => value, setter, true, false)
				} catch (e) {
					return e
				}
			}
		}
}
