/**
 * @module utils
 * @author Billow Z <billowz@hotmail.com>
 * @created Wed Jul 25 2018 15:24:47 GMT+0800 (China Standard Time)
 * @modified Mon Apr 08 2019 13:27:56 GMT+0800 (China Standard Time)
 */

//#if _TARGET !== 'es3'

export const prototypeOf = true
export const protoProp = true
export const protoOf = Object.getPrototypeOf
export const __setProto = Object.setPrototypeOf
export const setProto = __setProto

/*#else

export { prototypeOf, protoProp, protoOf, __setProto, setProto } from './proto'

//#endif */
