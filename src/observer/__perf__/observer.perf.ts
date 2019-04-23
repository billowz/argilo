import { observer, $eq, proxy, source, observe, unobserve, ObserverTarget } from '..'
import { parsePath, defProp, propAccessor } from '../..'
import { T_UNDEF } from '../../utils/consts'

bechPath(1, observePerf, true)
bechPath(2, observePerf, true)
bechPath(3, observePerf, true)
bechPath(4, observePerf, true)
bechPath(1, observePerf, false)
bechPath(2, observePerf, false)
bechPath(3, observePerf, false)
bechPath(4, observePerf, false)
bechPath(1, unobservePerf, true)
bechPath(2, unobservePerf, true)
bechPath(3, unobservePerf, true)
bechPath(4, unobservePerf, true)
bechPath(1, unobservePerf, false)
bechPath(2, unobservePerf, false)
bechPath(3, unobservePerf, false)
bechPath(4, unobservePerf, false)
watchBench(1)
watchBench(10)

suite('observer (same object)', function() {
	const obj = {},
		array = []
	benchmark('Observer: object', function() {
		observer(obj)
	})
	benchmark('Observer: array', function() {
		observer(array)
	})
})

suite('observer (diff object)', function() {
	benchmark('Observer: object', function() {
		observer({})
	})
	benchmark('Observer: array', function() {
		observer([])
	})
})

suite('observer: Equal', function() {
	const s1 = {},
		s2 = {}
	const p1 = observer({}).proxy
	const p2 = observer({}).proxy

	benchmark('observer.$eq(:source, :source)', function() {
		return $eq(s1, s2)
	})

	benchmark('observer.$eq(:proxy, :proxy)', function() {
		return $eq(p1, p2)
	})

	benchmark('observer.$eq(:source, :proxy)', function() {
		return $eq(s1, p2)
	})

	benchmark('observer.$eq(:proxy, :source)', function() {
		return $eq(p1, s2)
	})

	benchmark('native compare', function() {
		return s1 === s2
	})
})

suite('observer: proxy', function() {
	const s = {}
	const obs = observer(s)
	benchmark('proxy(:source)', function() {
		return proxy(s)
	})

	const p = obs.proxy
	benchmark('proxy(:proxy)', function() {
		return proxy(p)
	})
})

suite('observer: source', function() {
	const a = {}
	const obs = observer(a)
	benchmark('source(:source)', function() {
		return source(a)
	})

	const p = obs.proxy
	benchmark('source(:proxy)', function() {
		return source(p)
	})
})

function observePerf(
	title: string,
	path: string,
	nextObj: () => { obj: ObserverTarget; fn: (...args: any[]) => void }
) {
	benchmark(title, function() {
		let data = nextObj()
		observe(data.obj, path, data.fn)
	})
}

function unobservePerf(
	title: string,
	path: string,
	nextObj: () => { obj: ObserverTarget; fn: (...args: any[]) => void }
) {
	benchmark(title, function() {
		let data = nextObj()
		observe(data.obj, path, data.fn)
		unobserve(data.obj, path, data.fn)
	})
}

function objBuilder(path: string | string[], sameObj: boolean, fn?: (...args: any[]) => void) {
	path = parsePath(path)
	fn = fn || function() {}
	let last = path.length - 1,
		builder: () => { obj: ObserverTarget; fn: (...args: any[]) => void }
	if (path[last] === 'length' || path[last] === 'change') {
		builder = last
			? function() {
					let obj = {},
						i = 0,
						tmp = obj
					for (; i < last - 1; i++) {
						tmp = tmp[path[i]] = {}
					}
					tmp[path[i]] = []
					return {
						obj,
						fn
					}
			  }
			: function() {
					return {
						obj: [],
						fn
					}
			  }
	} else {
		builder = function() {
			let obj = {},
				i = 0,
				tmp = obj
			for (; i < last; i++) {
				tmp = tmp[path[i]] = {}
			}
			tmp[path[i]] = 1
			return {
				obj,
				fn
			}
		}
	}
	if (!sameObj) return builder
	let o = builder()
	return function() {
		return o
	}
}

function buildPath(level: number) {
	let paths = [],
		path = [],
		i = 0
	for (; i < level; i++) path[i] = 'test'

	paths.push(path.join('.'))

	path[path.length - 1] = 'length'
	//paths.push(path.join('.'))

	path[path.length - 1] = 'change'
	//paths.push(path.join('.'))
	return paths
}

function bechPath(
	level: number,
	bench: (title: string, path: string, nextObj: () => { obj: ObserverTarget; fn: (...args: any[]) => void }) => void,
	sameObj: boolean,
	fn?: (...args: any[]) => void
) {
	let title = bench === observePerf ? 'observe' : 'observe & unobserve'
	let paths = buildPath(level)

	suite(`${title}: path[${level}] (${sameObj ? 'same' : 'diff'} object)`, function() {
		for (let i = 0, p: string, t: string; i < paths.length; i++) {
			p = parsePath(paths[i])
				.slice()
				.pop()
			t = `${p === 'length' ? 'Array.length' : p === 'change' ? 'Array.change' : 'Object'}[${paths[i]}]`
			bench(t, paths[i], objBuilder(paths[i], sameObj, fn))
		}
	})
}

function watchBench(attrNum: number) {
	const attrs = new Array(attrNum)
	for (let i = 0; i < attrNum; i++) attrs[i] = 'attr' + i
	if (typeof Proxy !== T_UNDEF && propAccessor)
		suite(`Proxy vs defineProperty${attrNum > 1 ? ' ' + attrNum + ' attributes' : ''}`, function() {
			if (typeof Proxy !== T_UNDEF) {
				benchmark('Proxy', function() {
					const obj = createObj()
					new Proxy(obj, {
						get(source, attr, proxy) {
							return source[attr]
						},
						set(source, attr, value, proxy) {
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
		const obj = {}
		for (let i = 0; i < attrNum; i++) {
			obj['attr' + i] = 1
		}
		return obj
	}
}
