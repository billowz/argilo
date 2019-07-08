/**
 * @module utils/dkeys
 * @author Billow Z <billowz@hotmail.com>
 * @created Mon Mar 11 2019 17:22:13 GMT+0800 (China Standard Time)
 * @modified Sat Mar 23 2019 17:42:04 GMT+0800 (China Standard Time)
 */
import { NULL_CTOR } from './consts'

export const DKeyMap: { [key: string]: boolean } = new (NULL_CTOR as any)()

export const DKeys: string[] = []

export function isDKey(key: string) {
	return DKeyMap[key] || false
}

export function addDKey(key: string) {
	if (!DKeyMap[key]) {
		DKeyMap[key] = true
		DKeys.push(key)
	}
	return key
}

export function addDKeys(...keys: string[]): void

export function addDKeys() {
	const args = arguments,
		l = args.length
	for (var i = 0; i < l; i++) {
		addDKey(args[i] + '')
	}
}

export function getDKeys() {
	return DKeys
}

export function getDKeyMap() {
	return DKeys
}
