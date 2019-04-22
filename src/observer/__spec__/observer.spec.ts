import {
	observer,
	source,
	proxy,
	getObserver,
	IObserver,
	VBPROXY_KEY,
	VBPROXY_CTOR_KEY,
	OBSERVER_KEY,
	$eq,
	proxyEnable,
	observe,
	ObserverTarget,
	ObserverCallback,
	observedId,
	unobserveId,
	observed
} from '../index'
import { format } from '../../format'
import { parsePath, formatPath } from '../../path'
import { nextTick } from '../../nextTick'
import { create, isDKey, assign, keys, eq, eachObj, mapObj, eachArray } from '../../utils'
import { assert, popErrStack } from '../../assert'

const vb = proxyEnable === 'vb',
	es6proxy = proxyEnable === 'proxy'

describe('observer', function() {
	it('default keys', function() {
		assert.is(isDKey(OBSERVER_KEY), `require Default Key: ${OBSERVER_KEY}`)
		if (proxyEnable === 'vb') {
			assert.is(isDKey(VBPROXY_KEY), `require Default Key: ${VBPROXY_KEY}`)
			assert.is(isDKey(VBPROXY_CTOR_KEY), `require Default Key: ${VBPROXY_CTOR_KEY}`)
		}
	})

	it('create observer', function() {
		const objObs = createObserver({})
		const cObs = createObserver(create(objObs.target))

		assert.notEq(objObs, cObs)

		assert.eq(keys(objObs.target).length, 0)
		assert.eq(keys(assign({}, objObs.target)).length, 0)
		assert.eq(keys(create(objObs.target)).length, 0)

		assert.eq(keys(objObs.proxy).length, 0)
		assert.eq(keys(assign({}, objObs.proxy)).length, 0)
		assert.eq(keys(create(objObs.proxy)).length, 0)

		createObserver([])

		class Cls {}
		createObserver(new Cls())

		function Ctor() {}
		createObserver(new Ctor())

		assert.throw(() => observer(1))
		assert.throw(() => observer(new Date()))

		const o = {}
		assert.eq(source(o), o)
		assert.eq(proxy(o), o)

		function createObserver<T extends ObserverTarget>(obj: T): IObserver<T> {
			assert.not(getObserver(obj), `got the observer on new unobservable object`)

			const obs = observer(obj)
			assert.eq(obj, obs.target)
			assert.eq(source(obj), obs.target)
			assert.eq(proxy(obj), obs.proxy)
			assert.eq(obs, getObserver(obj))
			assert.eq(obs, observer(obj))

			assert.is($eq(obj, obs.target))
			assert.is($eq(obj, obs.proxy))
			if (proxyEnable && (es6proxy || !obs.isArray)) {
				assert.notEq(obj, obs.proxy)
			}
			return obs
		}
	})

	//========================================================================================
	/*                                                                                      *
	 *                                 Test on Simple Object                                *
	 *                                                                                      */
	//========================================================================================

	interface SimpleObject {
		name: string
		email: string
		age: number
	}

	const simpleObject: SimpleObject = {
		name: 'Mary',
		email: 'mary@domain.com',
		age: 18
	}
	function observeSimpleObject(o: SimpleObject, end: () => void) {
		new ObserveChain(o, [
			{
				name: 'update properties',
				setup(o, c) {
					c.collect('name', 'email', 'age')
					o.name = 'Paulxx'
					o.name = 'Paul'
					o.email = 'paul@domain.com'
					o.age = 15
				},
				done(o, c) {
					c.expect({ name: ['Paul', 'Mary'], email: ['paul@domain.com', 'mary@domain.com'], age: [15, 18] })
				}
			},
			{
				name: 'rollback update properties',
				setup(o, c) {
					o.name = 'Mary'
					o.email = 'mary@domain.com'
					o.age = 18
					// rollback
					o.name = 'Paul'
					o.email = 'paul@domain.com'
					o.age = 15
				},
				done(o, c) {
					c.expect({})
				}
			},
			{
				name: 'unobserve email',
				setup(o, c) {
					o.name = 'Mary2'
					o.name = 'Mary'
					o.email = 'mary@domain.com'
					c.uncollect('email')
				},
				done(o, c) {
					c.expect({ name: ['Mary', 'Paul'] })
				}
			},
			{
				name: 'unobserve all',
				setup(o, c) {
					c.uncollect()
					o.name = 'Paul'
					o.email = 'paul@domain.com'
					o.age = 20
				},
				done(o, c) {
					c.expect({})
				}
			},
			{
				name: 'reset object states',
				setup(o, c) {
					assign(o, simpleObject)
				}
			}
		]).run(end)
	}

	it('observe changes on an literal object', function(done) {
		observeSimpleObject(assign({}, simpleObject), done)
	})

	it('observe changes on an instance of class', function(done) {
		class A {
			public name: string = simpleObject.name
			public email: string
			constructor(email: string) {
				this.email = email
			}
		}
		class B extends A {
			public age: number
			constructor(age: number) {
				super(simpleObject.email)
				this.age = age
			}
		}
		observeSimpleObject(new B(simpleObject.age), done)
	})

	it('observe changes on an instance of constructor', function(done) {
		function A(email: string) {
			this.email = email
		}
		A.prototype.name = simpleObject.name

		function B(age: number) {
			A.call(this, simpleObject.email)
			this.age = age
		}
		B.prototype = create(A.prototype)
		observeSimpleObject(new B(simpleObject.age), done)
	})

	it('observe changes on an sub-object', function(done) {
		const o = assign({}, simpleObject)
		observeSimpleObject(o, () => {
			const o2 = create(o, {
				name: { value: simpleObject.name, writable: true, enumerable: true, configurable: true },
				email: { value: simpleObject.email, writable: true, enumerable: true, configurable: true },
				age: { value: simpleObject.age, writable: true, enumerable: true, configurable: true }
			})
			observeSimpleObject(o2, () => {
				observeSimpleObject(create(o2), done)
			})
		})
	})

	//========================================================================================
	/*                                                                                      *
	 *                                 Test on Simple Array                                 *
	 *                                                                                      */
	//========================================================================================

	it('observe changes on an array property', function(end) {
		new ObserveChain(
			[1],
			[
				{
					// [2]
					name: 'set index',
					setup(o, c) {
						c.collect('[0]', 'length', '$change')
						o[0]++
					},
					done(o, c) {
						c.expect(
							vb
								? {}
								: {
										'[0]': [2, 1],
										$change: [o, o]
								  }
						)
					}
				},
				{
					// [2,1]
					name: 'array.push',
					setup(o, c) {
						o.push(1)
					},
					done(o, c) {
						c.expect({
							length: [2, 1],
							$change: [o, o]
						})
					}
				},
				{
					// [3,2,1]
					name: 'array.unshift',
					setup(o, c) {
						o.unshift(3)
					},
					done(o, c) {
						c.expect({
							'[0]': [3, 2],
							length: [3, 2],
							$change: [o, o]
						})
					}
				},
				{
					// [4,2,1]
					name: 'array.splice 0',
					setup(o, c) {
						o.splice(0, 1, 4)
					},
					done(o, c) {
						c.expect({
							'[0]': [4, 3],
							$change: [o, o]
						})
					}
				},
				{
					// [4,3,2,1]
					name: 'array.splice +1',
					setup(o, c) {
						o.splice(1, 0, 3)
					},
					done(o, c) {
						c.expect({
							length: [4, 3],
							$change: [o, o]
						})
					}
				},
				{
					// [3,2,1]
					name: 'array.splice -1',
					setup(o, c) {
						o.splice(0, 1)
					},
					done(o, c) {
						c.expect({
							'[0]': [3, 4],
							length: [3, 4],
							$change: [o, o]
						})
					}
				},
				{
					// [3,2]
					name: 'array.pop',
					setup(o, c) {
						o.pop()
					},
					done(o, c) {
						c.expect({
							length: [2, 3],
							$change: [o, o]
						})
					}
				},
				{
					// [2]
					name: 'array.shift',
					setup(o, c) {
						o.shift()
					},
					done(o, c) {
						c.expect({
							'[0]': [2, 3],
							length: [1, 2],
							$change: [o, o]
						})
					}
				},
				{
					// [2,3,4,5]
					name: 'set out index',
					setup(o, c) {
						o[1] = 3
						o[2] = 4
						o[3] = 5
					},
					done(o, c) {
						c.expect(
							es6proxy
								? {
										length: [4, 1],
										$change: [o, o]
								  }
								: {}
						)
					}
				},
				{
					// [5,4,3,2]
					name: 'array.sort',
					setup(o, c) {
						o.sort((a, b) => b - a)
					},
					done(o, c) {
						c.expect({
							'[0]': [5, 2],
							$change: [o, o]
						})
					}
				},
				[].reverse && {
					// [2,3,4,5]
					name: 'array.reverse',
					setup(o, c) {
						o.reverse()
					},
					done(o, c) {
						c.expect({
							'[0]': [2, 5],
							$change: [o, o]
						})
					}
				},
				[].fill && {
					// [0,0,0,0]
					name: 'array.fill',
					setup(o, c) {
						o.fill(0)
					},
					done(o, c) {
						c.expect({
							'[0]': [0, 2],
							$change: [o, o]
						})
					}
				}
			]
		).run(end)
	})

	//========================================================================================
	/*                                                                                      *
	 *                                Test on Complex Object                                *
	 *                                                                                      */
	//========================================================================================

	interface ComplexObject {
		name: string
		latest: string
		versions: ({
			version: string
			publish: Date
		})[]
		dependencies: {
			[name: string]: {
				name: string
				version: string
			}
		}
	}
	const complexObject: ComplexObject = {
		name: 'argilo',
		latest: null,
		versions: [],
		dependencies: {
			lodash: {
				name: 'lodash',
				version: '4.17.8'
			}
		}
	}
	function cloneComplexObject() {
		return assign({}, complexObject, {
			versions: [],
			dependencies: {
				lodash: assign({}, complexObject.dependencies.lodash)
			}
		})
	}

	function observeComplexObject(o: ComplexObject, end: () => void) {
		new ObserveChain(o, [
			{
				name: 'listen',
				setup(o, c) {
					c.collect(
						'name',
						'latest',
						'versions',
						'versions.$change',
						'versions.length',
						'versions[0].version',
						'versions[0].publish',
						'dependencies',
						'dependencies.lodash',
						'dependencies.lodash.version',
						'dependencies.lodash.name'
					)
					observe(o, 'versions[0].version', (path, v) => {
						o.latest = v
					})
				}
			},
			{
				name: 'change in array property (add Version: 1.0.0)',
				version: {
					version: '1.0.0',
					publish: new Date(1555898400000)
				},
				setup(o, c) {
					o.versions.push(assign({}, this.version))
				},
				done(o, c) {
					c.expect({
						'versions.$change': [[this.version], [this.version]],
						'versions.length': [1, 0],
						'versions[0].version': ['1.0.0', undefined],
						'versions[0].publish': [new Date(1555898400000), undefined]
					})
				}
			},
			{
				name: 'sync the latest: 1.0.0',
				done(o, c) {
					c.expect({
						latest: ['1.0.0', null]
					})
				}
			},
			{
				name: 'set array property (set versions: [1.0.1, 1.0.0])',
				version: {
					version: '1.0.1',
					publish: new Date(1555927200000)
				},
				oldVersion: {
					version: '1.0.0',
					publish: new Date(1555898400000)
				},
				setup(o, c) {
					o.versions = [assign({}, this.version)].concat(o.versions)
				},
				done(o, c) {
					c.expect({
						'versions': [[this.version, this.oldVersion], [this.oldVersion]],
						'versions.$change': [[this.version, this.oldVersion], [this.oldVersion]],
						'versions.length': [2, 1],
						'versions[0].version': ['1.0.1', '1.0.0'],
						'versions[0].publish': [new Date(1555927200000), new Date(1555898400000)]
					})
				}
			},
			{
				name: 'sync the latest: 1.0.1',
				done(o, c) {
					c.expect({
						latest: ['1.0.1', '1.0.0']
					})
				}
			},
			{
				name: 'set array property with same object (reset versions)',
				versions: [
					{
						version: '1.0.1',
						publish: new Date(1555927200000)
					},
					{
						version: '1.0.0',
						publish: new Date(1555898400000)
					}
				],
				setup(o, c) {
					o.versions = o.versions
				},
				done(o, c) {
					c.expect({
						versions: [this.versions, this.versions],
						'versions.$change': [this.versions, this.versions]
					})
				}
			},
			{
				name: 'clean array property (clean versions)',
				setup(o, c) {
					o.versions = null
				},
				done(o, c) {
					const oldVersions = [
						{
							version: '1.0.1',
							publish: new Date(1555927200000)
						},
						{
							version: '1.0.0',
							publish: new Date(1555898400000)
						}
					]
					c.expect({
						versions: [null, oldVersions],
						'versions.$change': [undefined, oldVersions],
						'versions[0].version': [undefined, '1.0.1'],
						'versions[0].publish': [undefined, new Date(1555927200000)]
					})
				}
			},
			{
				name: 'sync the latest: undefined',
				done(o, c) {
					c.expect({
						latest: [undefined, '1.0.1']
					})
				}
			},
			{
				name: 'change in object property (update lodash dependency)',
				setup(o, c) {
					o.dependencies.lodash.version = '4.17.9'
				},
				done(o, c) {
					c.expect({
						'dependencies.lodash.version': ['4.17.9', '4.17.8']
					})
				}
			},
			{
				name: 'set object property (set dependency)',
				oldDep: {
					lodash: {
						name: 'lodash',
						version: '4.17.9'
					}
				},
				dep: {
					lodash: {
						name: 'lodash',
						version: '4.17.10'
					}
				},
				setup(o, c) {
					o.dependencies = {
						lodash: {
							name: 'lodash',
							version: '4.17.10'
						}
					}
				},
				done(o, c) {
					c.expect({
						dependencies: [this.dep, this.oldDep],
						'dependencies.lodash': [this.dep.lodash, this.oldDep.lodash],
						'dependencies.lodash.version': ['4.17.10', '4.17.9']
					})
				}
			}
		]).run(end)
	}

	it('observe changes on an complex object', function(done) {
		observeComplexObject(cloneComplexObject(), done)
	})
})

//========================================================================================
/*                                                                                      *
 *                                     Observe Chain                                    *
 *                                                                                      */
//========================================================================================

let __p__ = 0
class ObserveChain<T extends ObserverTarget> {
	ob: IObserver<T>
	ctxs: {
		[path: string]: {
			called: number
			cb: ObserverCallback<T>
			path: string
			dirties: [any, any][]
			listenId: string
		}
	}
	stepIdx: number
	steps: {
		name?: string
		setup?: (o: T, c: ObserveChain<T>) => void
		done?: (
			o: T,
			c: ObserveChain<T>,
			w: {
				[path: string]: [any, any]
			}
		) => void
	}[]

	constructor(
		o: T,
		steps?: {
			name?: string
			setup?: (o: T, c: ObserveChain<T>) => void
			done?: (
				o: T,
				c: ObserveChain<T>,
				w: {
					[path: string]: [any, any]
				}
			) => void
			[key: string]: any
		}[]
	) {
		this.ob = observer(o)
		this.stepIdx = 0
		this.ctxs = {}
		this.steps = steps || []
	}

	step(
		setup: (o: T, c: ObserveChain<T>) => void,
		done?: (
			o: T,
			c: ObserveChain<T>,
			w: {
				[path: string]: [any, any]
			}
		) => void
	) {
		this.steps.push({ setup, done })
		return this
	}

	run(done: () => void) {
		const { steps, stepIdx } = this

		if (stepIdx >= steps.length) {
			done && done()
			return
		}

		const step = steps[stepIdx]
		if (step) {
			step.setup && step.setup(this.ob.proxy, this)

			nextTick(() => {
				step.done && step.done(this.ob.proxy, this, mapObj(this.ctxs, ctx => ctx.dirties[stepIdx]))

				this.stepIdx++

				this.run(done)
			})
		} else {
			this.stepIdx++
			this.run(done)
		}
	}
	collect(...paths: string[]): void
	collect() {
		eachArray(arguments, path => this.collectPath(path))
	}
	uncollect(...paths: string[]): void
	uncollect() {
		eachArray(arguments.length ? arguments : keys(this.ctxs), path => this.uncollectPath(path))
	}
	stepLabel() {
		const { stepIdx } = this
		const step = this.steps[stepIdx]
		return step && step.name ? stepIdx + ': ' + step.name : stepIdx
	}
	collectPath(path: string) {
		const chain = this
		const { ob, ctxs } = this
		const o = __p__++ & 1 ? ob.target : ob.proxy,
			ctx =
				ctxs[path] ||
				(ctxs[path] = {
					called: 0,
					cb(path: string[], value: any, original: any, observer: IObserver<T>) {
						const stepLabel = chain.stepLabel(),
							stepIdx = chain.stepIdx
						assert.eq(
							this,
							ctx,
							`[{}][{}]: invalid context on observer callback: {0j} expect to {1j}`,
							stepLabel,
							ctx.path
						)
						assert.is(
							ctx.listenId,
							`[{}][{}]: observer callback is not listened, listen-id: {0}`,
							stepLabel,
							ctx.path
						)

						assert.eq(ob, observer, `[{}][{}]: invalid observer on observer callback`, stepLabel, ctx.path)
						assert.eql(
							path,
							parsePath(ctx.path),
							`[{}][{}]: invalid path[{}] on observer callback`,
							stepLabel,
							ctx.path,
							formatPath(path)
						)
						assert.not(
							ctx.dirties[stepIdx],
							`[{}][{}]: double notified observer callback`,
							stepLabel,
							ctx.path
						)
						ctx.dirties[stepIdx] = [value, original]
						ctx.called++

						console.log(
							format(
								`[{}][{}]: collected dirty, value: {j}, origin: {j}`,
								stepLabel,
								ctx.path,
								value,
								original
							)
						)
					},
					path,
					dirties: [],
					listenId: null
				})

		if (!ctx.listenId) {
			ctx.listenId = __p__++ & 1 ? observe(o, path, ctx.cb, ctx) : ob.observe(path, ctx.cb, ctx)

			const stepLabel = this.stepLabel()
			assert.is(
				observedId(o, path, ctx.listenId),
				`[{}][{}]: observe failed, listen-id: {}`,
				stepLabel,
				path,
				ctx.listenId
			)
			assert.eq(
				ctx.listenId,
				ob.observed(path, ctx.cb, ctx),
				`[{}][{}]: observe failed, listen-id: {0}`,
				stepLabel,
				path
			)

			console.log(format(`[{}][{}]: observe: {}`, stepLabel, path, ctx.listenId))
		}
	}
	uncollectPath(path: string) {
		const { ob } = this
		const o = __p__++ & 1 ? ob.target : ob.proxy,
			ctx = this.ctxs[path]

		if (ctx && ctx.listenId) {
			const stepLabel = this.stepLabel()

			assert.is(
				observedId(o, path, ctx.listenId),
				`[{}][{}]: un-listened, listen-id: {}`,
				stepLabel,
				path,
				ctx.listenId
			)
			assert.eq(
				ctx.listenId,
				ob.observed(path, ctx.cb, ctx),
				`[{}][{}]: un-listened, listen-id: {0}`,
				stepLabel,
				path
			)
			__p__++ & 1 ? this.ob.unobserve(path, ctx.cb, ctx) : unobserveId(o, path, ctx.listenId)

			assert.not(
				this.ob.observedId(path, ctx.listenId),
				`[{}][{}]: unobserve failed, listen-id: {}`,
				stepLabel,
				path,
				ctx.listenId
			)

			assert.not(
				observed(o, path, ctx.cb, ctx),
				`[{}][{}]: unobserve failed, listen-id: {}`,
				stepLabel,
				path,
				ctx.listenId
			)
			console.log(format(`[{}][{}]: unobserved: {}`, stepLabel, path, ctx.listenId))
			ctx.listenId = null
		}
	}
	expect(expect: { [path: string]: [any, any?] }) {
		const { ctxs, stepIdx } = this
		const stepLabel = this.stepLabel()
		expect = expect || {}
		try {
			eachObj(expect, (e, path) => {
				const ctx = ctxs[path],
					d = ctx.dirties[stepIdx]
				if (e) {
					assert.is(
						d,
						'[{}][{}]: miss the dirty, expect to value: {{[0]}j}, origin: {@{[1]}j}',
						stepLabel,
						path,
						e
					)
					assert.eql(d[0], e[0], '[{}][{}]: expect dirty value: {0j} to {1j}', stepLabel, path)
					if (e.length > 1)
						assert.eql(d[1], e[1], '[{}][{}]: expect origin value: {0j} to {1j}', stepLabel, path)
				}
			})

			eachObj(ctxs, (ctx, path) => {
				const e = expect[path],
					d = ctx.dirties[stepIdx]
				if (!e)
					assert.not(d, '[{}][{}]: collected the dirty, value: {0{[0]}j}, origin: {0{[1]}j}', stepLabel, path)
			})
		} catch (e) {
			throw popErrStack(e, 3)
		}
		return this
	}
}
