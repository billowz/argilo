/**
 * @module observer
 * @author Billow Z <billowz@hotmail.com>
 * @created Wed Dec 26 2018 13:59:10 GMT+0800 (China Standard Time)
 * @modified Tue Apr 23 2019 17:13:10 GMT+0800 (China Standard Time)
 */

import { ObservePolicy } from './ObservePolicy'
import { assert } from '../assert'
import proxyPolicy from './ProxyPolicy'

/*#if _TARGET !== 'es6'
import accessorPolicy from './AccessorPolicy'
//#endif */

/*#if _TARGET === 'es3'
import vbPolicy from './VBPolicy'
//#endif */

//#if _TARGET === 'es6'
const policy: ObservePolicy = proxyPolicy()
/*#elif _TARGET === 'es5'
const policy: ObservePolicy = proxyPolicy() || accessorPolicy()
//#else
const policy: ObservePolicy = proxyPolicy() || accessorPolicy() || vbPolicy()
//#endif */


assert.is(policy, 'Browser does not support observer.')

//#if _DEBUG
console.info(`the observer policy: ${policy.__name} -> `, policy)
//#endif

export default policy
