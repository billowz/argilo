import { observer, $eq, proxy, source } from '..'

suite('observer: Equal', function() {
	const n1 = {},
		n2 = {},
		s1 = {},
		s2 = {}
	const p1 = observer(s1).proxy
	const p2 = observer(s2).proxy

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
		return $eq(p2, s1)
	})

	benchmark('observer.$eq(:native, :native)', function() {
		return $eq(n1, n2)
	})

	benchmark('observer.$eq(:native, :proxy)', function() {
		return $eq(n1, p2)
	})

	benchmark('observer.$eq(:proxy, :native)', function() {
		return $eq(p1, n2)
	})

	benchmark('observer.$eq(:native, :source)', function() {
		return $eq(n1, s2)
	})

	benchmark('observer.$eq(:source, :native)', function() {
		return $eq(s1, n2)
	})

	benchmark('native compare', function() {
		return n1 === n2
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
