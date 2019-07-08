import { observer, observe, unobserve, ObserverTarget } from '..'
import { parsePath } from '../..'

suite('observer (same object)', function() {
	const obj = {},
		array: any[] = []
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
