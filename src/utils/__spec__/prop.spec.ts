import '../defProp'
import { assert } from '../../assert'
import { hasOwnProp, getOwnProp } from '../ownProp'
import { create } from '../create'
import { propDescriptor, defProp, defValue, propAccessor, defAccessor } from '../defProp'
describe('utils/defProp', function() {
	it('hasOwnProp', () => {
		assert.is(hasOwnProp({ a: undefined }, 'a'))
		assert.not(hasOwnProp(create({ a: undefined }), 'toString'))
	})
	it('getOwnProp', () => {
		assert.eq(getOwnProp({ a: 1 }, 'a'), 1)
		assert.eq(getOwnProp(create({ a: 1 }), 'a'), undefined)
		assert.eq(getOwnProp(create({ a: 1 }), 'a', 2), 2)
	})
	it('defProp', () => {
		const o: { [key: string]: any } = {}
		if (propDescriptor) {
			defProp(o, 'a', {
				value: 1,
				configurable: false,
				enumerable: false,
				writable: false
			})
			assert.eq(o.a, 1)

			assert.eql(Object.getOwnPropertyDescriptor(o, 'a'), {
				value: 1,
				writable: false,
				enumerable: false,
				configurable: false
			})

			var i = 1
			var get = () => i++
			var set = () => {}
			if (propAccessor) {
				defProp(o, 'b', {
					get,
					set,
					enumerable: true,
					configurable: false
				})
				assert.eq(o.b, 1)
				assert.eq(o.b, 2)
				assert.eql(Object.getOwnPropertyDescriptor(o, 'b'), {
					get,
					set,
					enumerable: true,
					configurable: false
				})
			} else {
				assert.throw(() => defProp(o, 'b', { get, set }))
			}
		} else {
			defProp(o, 'a', {
				value: 1
			})
			assert.eq(o.a, 1)
		}
	})
	it('defValue', () => {
		const o: { [key: string]: any } = {}
		if (propDescriptor) {
			defValue(o, 'a', 1)
			assert.eq(o.a, 1)
			assert.eql(Object.getOwnPropertyDescriptor(o, 'a'), {
				value: 1,
				writable: true,
				enumerable: true,
				configurable: true
			})

			defValue(o, 'b', 2, false, true, false)
			assert.eq(o.b, 2)
			assert.eql(Object.getOwnPropertyDescriptor(o, 'b'), {
				value: 2,
				enumerable: false,
				configurable: true,
				writable: false
			})

			defValue(o, 'c', 3, true, true, false)
			assert.eq(o.c, 3)
			assert.eql(Object.getOwnPropertyDescriptor(o, 'c'), {
				value: 3,
				enumerable: true,
				configurable: true,
				writable: false
			})
		} else {
			defValue(o, 'a', 1)
			assert.eq(o.a, 1)
		}
	})
	it('defAccessor', () => {
		const o: { [key: string]: any } = {}
		var i = 1
		var get = () => i++
		var set = () => {}
		if (propAccessor) {
			defAccessor(o, 'a', get, set)

			assert.eq(o.a, 1)
			assert.eq(o.a, 2)

			assert.eql(Object.getOwnPropertyDescriptor(o, 'a'), {
				get,
				set,
				enumerable: true,
				configurable: true
			})

			defAccessor(o, 'b', get, set, false, true)

			assert.eq(o.a, 3)
			assert.eq(o.a, 4)

			assert.eql(Object.getOwnPropertyDescriptor(o, 'b'), {
				get,
				set,
				enumerable: false,
				configurable: true
			})
		} else {
			assert.throw(() => defAccessor(o, 'b', get, set))
		}
	})
})
