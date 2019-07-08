import { mapArray, propAccessor, defProp } from '../..'
import { T_UNDEF } from '../../utils/consts'

watchBench(1)
watchBench(10)
watchBench(50)

function watchBench(attrNum: number) {
	const attrs = mapArray(new Array(attrNum), (v, i) => `attr${i}`)

	suite(`Proxy vs defineProperty${attrNum > 1 ? ' ' + attrNum + ' attributes' : ''}`, function() {
		if (typeof Proxy !== T_UNDEF) {
			benchmark('Proxy', function() {
				const obj = createObj()
				new Proxy(obj, {
					get(source: any, attr, proxy) {
						return source[attr]
					},
					set(source: any, attr, value, proxy) {
						source[attr] = value
						return true
					}
				})
			})
		}
		if (propAccessor) {
			benchmark('Object.defineProperty', function() {
				const obj = createObj()
				for (let i = 0; i < attrNum; i++) __defineProp(obj, attrs[i])
			})
		}
	})

	function __defineProp(obj: any, attr: string) {
		let value = obj[attr]
		defProp(obj, attr, {
			enumerable: true,
			configurable: true,
			get() {
				return value
			},
			set(newValue) {
				value = newValue
			}
		})
	}

	function createObj() {
		const obj: { [key: string]: number } = {}
		for (let i = 0; i < attrNum; i++) {
			obj['attr' + i] = 1
		}
		return obj
	}
}
