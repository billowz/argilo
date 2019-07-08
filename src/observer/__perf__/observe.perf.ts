import { parsePath, ObserverTarget, mapArray, observe, unobserve, formatPath, eachArray } from '../..'

perf(1, true, true)
perf(2, true, true)
perf(3, true, true)
perf(4, true, true)
perf(1, false, true)
perf(2, false, true)
perf(3, false, true)
perf(4, false, true)

type Perf = {
	title: string
	run: (
		title: string,
		path: string | string[],
		next: () => { obj: ObserverTarget; fn: (...args: any[]) => void }
	) => void
}
function __() {}
function perf(depth: number, sameObj: boolean, sameHandler: boolean) {
	const perfs: Perf[] = [
		{
			title: 'observe',
			run(title, path, next) {
				benchmark(title, function() {
					const { obj, fn } = next()
					observe(obj, path, fn)
				})
			}
		},
		{
			title: 'observe & unobserve',
			run(title, path, next) {
				benchmark(title, function() {
					const { obj, fn } = next()
					observe(obj, path, fn)
					unobserve(obj, path, fn)
				})
			}
		}
	]
	const fn = sameHandler
		? () => __
		: () => {
				return function() {}
		  }
	eachArray(perfs, perf => {
		suite(
			`${perf.title}: depth = ${depth}, object = ${sameObj ? 'same' : 'diff'}, handler = ${
				sameHandler ? 'same' : 'diff'
			}`,
			function() {
				eachArray([buildPath(depth), buildPath(depth, 'length'), buildPath(depth, 'change')], path => {
					perf.run(formatPath(path), path, objBuilder(path, sameObj, fn))
				})
			}
		)
	})
}

function objBuilder(
	path: string | string[],
	sameObj: boolean,
	fn: (depth: number) => (...args: any[]) => void
): () => { obj: ObserverTarget; fn: (...args: any[]) => void } {
	path = parsePath(path)

	let last = path.length - 1,
		builder: () => { obj: ObserverTarget; fn: (...args: any[]) => void } =
			path[last] === 'length' || path[last] === '$change'
				? () => {
						let obj = {},
							i = 0,
							tmp: any = obj
						for (; i < last - 1; i++) {
							tmp = tmp[path[i]] = {}
						}
						tmp[path[i]] = []
						return {
							obj,
							fn: fn(i)
						}
				  }
				: () => {
						let obj = {},
							i = 0,
							tmp: any = obj
						for (; i <= last; i++) {
							tmp = tmp[path[i]] = {}
						}
						return {
							obj,
							fn
						}
				  }
	if (!sameObj) return builder
	let o = builder()
	return function() {
		return o
	}
}

function buildPath(depth: number, last?: string): string {
	return mapArray(new Array(depth - 1), (v, i) => `prop${i + 1}`)
		.concat(last || `prop${depth}`)
		.join('.')
}
