/**
 * Observe implementation on the Proxy of ES6
 * @module observer
 * @author Billow Z <billowz@hotmail.com>
 * @created Tue Mar 19 2019 14:12:23 GMT+0800 (China Standard Time)
 * @modified Tue Apr 23 2019 18:43:29 GMT+0800 (China Standard Time)
 */

import { IObserver, ObserverTarget, ARRAY_CHANGE, ARRAY_LENGTH } from './IObserver'
import { ObservePolicy } from './ObservePolicy'
import { T_UNDEF } from '../utils/consts'

/**
 * @ignore
 */
export default function proxyPolicy(): ObservePolicy {
	if (typeof Proxy !== T_UNDEF)
		return {
			__name: 'Proxy',
			__proxy: 'proxy',
			__createProxy<T extends ObserverTarget>(observer: IObserver<T>, target: T, isArray: boolean): T {
				let setter: (source: ObserverTarget, prop: string, value: any) => boolean
				if (isArray) {
					// cache the array length for set out index on Array
					var len = (target as any)[ARRAY_LENGTH]
					setter = (source: any, prop, value) => {
						if (prop === ARRAY_LENGTH) {
							if (len !== value) {
								observer.notify(ARRAY_LENGTH, len)
								observer.notify(ARRAY_CHANGE, observer.proxy)
								len = value
							}
						} else {
							observer.notify(prop, source[prop])
							if (prop >= len) {
								observer.notify(ARRAY_LENGTH, len)
								len = prop + 1
							}
							observer.notify(ARRAY_CHANGE, observer.proxy)
						}
						source[prop] = value
						return true
					}
				} else {
					setter = (source: any, prop, value) => {
						observer.notify(prop, source[prop])
						source[prop] = value
						return true
					}
				}
				return new Proxy(target, {
					set: setter
				}) as T
			},
			__watch() {}
		}
}
