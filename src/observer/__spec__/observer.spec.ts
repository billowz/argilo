import {
	observer,
	source,
	proxy,
	getObserver,
	IObserver,
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
import { VBPROXY_KEY, VBPROXY_CTOR_KEY } from '../VBPolicy'

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
		createObserver(new (Ctor as any)())

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

	it('JSON.stringify', function() {
		let obs: IObserver<any> = observer({ value1: undefined })

		obs.observe('value1', () => {})

		const s = JSON.stringify(obs.proxy)

		assert.eq(JSON.stringify(obs.proxy), '{}')
		assert.eq(JSON.stringify(obs.target), '{}')

		obs = observer({ a: 1, b: 1 })
		obs.observe('a', () => {})
		assert.eq(JSON.stringify(obs.proxy), '{"a":1,"b":1}')
		assert.eq(JSON.stringify(obs.target), '{"a":1,"b":1}')

		assert.eq(JSON.stringify([obs.proxy, obs.target]), '[{"a":1,"b":1},{"a":1,"b":1}]')
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
				name: '1. update properties',
				setup(o, c) {
					c.collect('name', 'email', 'age')
					o.name = 'Paulxx'
					o.name = 'Paul'
					o.email = 'paul@domain.com'
					o.age = 15
				},
				done(o: any, c) {
					c.expect({ name: ['Paul', 'Mary'], email: ['paul@domain.com', 'mary@domain.com'], age: [15, 18] })
				}
			},
			{
				name: '2. rollback update properties',
				setup(o, c) {
					o.name = 'Mary'
					o.email = 'mary@domain.com'
					o.age = 18
					// rollback
					o.name = 'Paul'
					o.email = 'paul@domain.com'
					o.age = 15
				},
				done(o: any, c) {
					c.expect({})
				}
			},
			{
				name: '3. unobserve email',
				setup(o, c) {
					o.name = 'Mary2'
					o.name = 'Mary'
					o.email = 'mary@domain.com'
					c.uncollect('email')
				},
				done(o: any, c) {
					c.expect({ name: ['Mary', 'Paul'] })
				}
			},
			{
				name: '4. unobserve all',
				setup(o, c) {
					c.uncollect()
					o.name = 'Paul'
					o.email = 'paul@domain.com'
					o.age = 20
				},
				done(o: any, c) {
					c.expect({})
				}
			},
			{
				name: '5. reset object states',
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
		observeSimpleObject(new (B as any)(simpleObject.age), done)
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
					name: '1. set index => [2]',
					setup(o, c) {
						c.collect('[0]', 'length', '$change')
						o[0]++
					},
					done(o: any, c) {
						c.expect(
							vb
								? {}
								: {
										'[0]': [2, 1],
										$change: [c.ob.proxy, c.ob.proxy]
								  }
						)
					}
				},
				{
					// [2,1]
					name: '2. array.push => [2,1]',
					setup(o, c) {
						o.push(1)
					},
					done(o: any, c) {
						c.expect({
							length: [2, 1],
							$change: [c.ob.proxy, c.ob.proxy]
						})
					}
				},
				{
					// [3,2,1]
					name: '3. array.unshift => [3,2,1]',
					setup(o, c) {
						o.unshift(3)
					},
					done(o: any, c) {
						c.expect({
							'[0]': [3, 2],
							length: [3, 2],
							$change: [c.ob.proxy, c.ob.proxy]
						})
					}
				},
				{
					// [4,2,1]
					name: '4. array.splice 0 => [4,2,1]',
					setup(o, c) {
						o.splice(0, 1, 4)
					},
					done(o: any, c) {
						c.expect({
							'[0]': [4, 3],
							$change: [c.ob.proxy, c.ob.proxy]
						})
					}
				},
				{
					// [4,3,2,1]
					name: '5. array.splice +1 => [4,3,2,1]',
					setup(o, c) {
						o.splice(1, 0, 3)
					},
					done(o: any, c) {
						c.expect({
							length: [4, 3],
							$change: [c.ob.proxy, c.ob.proxy]
						})
					}
				},
				{
					// [3,2,1]
					name: '6. array.splice -1 => [3,2,1]',
					setup(o, c) {
						o.splice(0, 1)
					},
					done(o: any, c) {
						c.expect({
							'[0]': [3, 4],
							length: [3, 4],
							$change: [c.ob.proxy, c.ob.proxy]
						})
					}
				},
				{
					// [3,2]
					name: '7. array.pop => [3,2]',
					setup(o, c) {
						o.pop()
					},
					done(o: any, c) {
						c.expect({
							length: [2, 3],
							$change: [c.ob.proxy, c.ob.proxy]
						})
					}
				},
				{
					// [2]
					name: '8. array.shift => [2]',
					setup(o, c) {
						o.shift()
					},
					done(o: any, c) {
						c.expect({
							'[0]': [2, 3],
							length: [1, 2],
							$change: [c.ob.proxy, c.ob.proxy]
						})
					}
				},
				{
					// [2,3,4,5]
					name: '9. set out index => [2,3,4,5]',
					setup(o, c) {
						o[1] = 3
						o[2] = 4
						o[3] = 5
					},
					done(o: any, c) {
						c.expect(
							es6proxy
								? {
										length: [4, 1],
										$change: [c.ob.proxy, c.ob.proxy]
								  }
								: {}
						)
					}
				},
				{
					// [5,4,3,2]
					name: '10. array.sort => [5,4,3,2]',
					setup(o, c) {
						o.sort((a, b) => b - a)
					},
					done(o: any, c) {
						c.expect({
							'[0]': [5, 2],
							$change: [c.ob.proxy, c.ob.proxy]
						})
					}
				},
				[].reverse && {
					// [2,3,4,5]
					name: '11. array.reverse => [2,3,4,5]',
					setup(o, c) {
						o.reverse()
					},
					done(o: any, c) {
						c.expect({
							'[0]': [2, 5],
							$change: [c.ob.proxy, c.ob.proxy]
						})
					}
				},
				[].fill && {
					// [0,0,0,0]
					name: '12. array.fill => [0,0,0,0]',
					setup(o, c) {
						o.fill(0)
					},
					done(o: any, c) {
						c.expect({
							'[0]': [0, 2],
							$change: [c.ob.proxy, c.ob.proxy]
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
			publish: string
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
		versions: [
			{
				version: '1.0.0',
				publish: '2019-04-22T00:00:00.000Z'
			}
		],
		dependencies: {
			lodash: {
				name: 'lodash',
				version: '4.17.8'
			}
		}
	}
	function cloneComplexObject() {
		return assign({}, complexObject, {
			versions: complexObject.versions.slice(),
			dependencies: {
				lodash: assign({}, complexObject.dependencies.lodash)
			}
		})
	}

	function observeComplexObject(o: ComplexObject, end: () => void) {
		new ObserveChain(o, [
			{
				name: '0. listen',
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
				name: '1. change in array property (add Version: 1.0.1)',
				versions: [
					{
						version: '1.0.1',
						publish: '2019-04-22T01:00:00.000Z'
					},
					{
						version: '1.0.0',
						publish: '2019-04-22T00:00:00.000Z'
					}
				],
				setup(o, c) {
					this.expectVersions = proxy(o.versions)
					o.versions.unshift(assign({}, this.versions[0]))
				},
				done(o: any, c) {
					c.expect({
						'versions.$change': [this.expectVersions, this.expectVersions],
						'versions.length': [2, 1],
						'versions[0].version': ['1.0.1', '1.0.0'],
						'versions[0].publish': ['2019-04-22T01:00:00.000Z', '2019-04-22T00:00:00.000Z']
					})
					c.expect(
						{
							'versions.$change': [this.versions, this.versions]
						},
						true
					)
				}
			},
			{
				name: '1.1. sync the latest: 1.0.1',
				done(o: any, c) {
					c.expect({
						latest: ['1.0.1', null]
					})
				}
			},
			{
				name: '2. set array property (set versions: [1.0.2, 1.0.1, 1.0.0])',
				versions: [
					{
						version: '1.0.2',
						publish: '2019-04-22T02:00:00.000Z'
					},
					{
						version: '1.0.1',
						publish: '2019-04-22T01:00:00.000Z'
					},
					{
						version: '1.0.0',
						publish: '2019-04-22T00:00:00.000Z'
					}
				],
				setup(o, c) {
					this.expectVersions = [[assign({}, this.versions[0])].concat(o.versions), proxy(o.versions)]
					o.versions = this.expectVersions[0]
				},
				done(o: any, c) {
					this.expectVersions[0] = proxy(this.expectVersions[0])
					c.expect({
						versions: this.expectVersions,
						'versions.$change': this.expectVersions,
						'versions.length': [3, 2],
						'versions[0].version': ['1.0.2', '1.0.1'],
						'versions[0].publish': ['2019-04-22T02:00:00.000Z', '2019-04-22T01:00:00.000Z']
					})
					c.expect(
						{
							versions: [this.versions, this.versions.slice(1)],
							'versions.$change': [this.versions, this.versions.slice(1)]
						},
						true
					)
				}
			},
			{
				name: '2.1. sync the latest: 1.0.2',
				done(o: any, c) {
					c.expect({
						latest: ['1.0.2', '1.0.1']
					})
				}
			},
			{
				name: '3. set array property with same object (reset versions)',
				versions: [
					{
						version: '1.0.2',
						publish: '2019-04-22T02:00:00.000Z'
					},
					{
						version: '1.0.1',
						publish: '2019-04-22T01:00:00.000Z'
					},
					{
						version: '1.0.0',
						publish: '2019-04-22T00:00:00.000Z'
					}
				],
				setup(o, c) {
					this.expectVersions = [proxy(o.versions), proxy(o.versions)]
					o.versions = o.versions
				},
				done(o: any, c) {
					c.expect({
						versions: this.expectVersions,
						'versions.$change': this.expectVersions
					})
					c.expect(
						{
							versions: [this.versions, this.versions],
							'versions.$change': [this.versions, this.versions]
						},
						true
					)
				}
			},
			{
				name: '4. clean array property (clean versions)',
				oldVersions: [
					{
						version: '1.0.2',
						publish: '2019-04-22T02:00:00.000Z'
					},
					{
						version: '1.0.1',
						publish: '2019-04-22T01:00:00.000Z'
					},
					{
						version: '1.0.0',
						publish: '2019-04-22T00:00:00.000Z'
					}
				],
				setup(o, c) {
					this.expectVersion = proxy(o.versions)
					o.versions = null
				},
				done(o: any, c) {
					c.expect({
						versions: [null, this.expectVersion],
						'versions.$change': [undefined, this.expectVersion],
						'versions.length': [undefined, 3],
						'versions[0].version': [undefined, '1.0.2'],
						'versions[0].publish': [undefined, '2019-04-22T02:00:00.000Z']
					})
					c.expect(
						{
							versions: [null, this.oldVersions],
							'versions.$change': [undefined, this.oldVersions]
						},
						true
					)
				}
			},
			{
				name: '4.1. sync the latest: undefined',
				done(o: any, c) {
					c.expect({
						latest: [undefined, '1.0.2']
					})
				}
			},
			{
				name: '5. change in object property (update lodash dependency)',
				setup(o, c) {
					o.dependencies.lodash.version = '4.17.9'
				},
				done(o: any, c) {
					c.expect({
						'dependencies.lodash.version': ['4.17.9', '4.17.8']
					})
				}
			},
			{
				name: '6. set object property (set dependency)',
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
					this.expectDeps = [
						{
							lodash: {
								name: 'lodash',
								version: '4.17.10'
							}
						},
						proxy(o.dependencies)
					]
					o.dependencies = this.expectDeps[0]
				},
				done(o: any, c) {
					this.expectDeps[0] = proxy(this.expectDeps[0])
					c.expect({
						dependencies: this.expectDeps,
						'dependencies.lodash': [proxy(this.expectDeps[0].lodash), proxy(this.expectDeps[1].lodash)],
						'dependencies.lodash.version': ['4.17.10', '4.17.9']
					})
					c.expect(
						{
							dependencies: [this.dep, this.oldDep],
							'dependencies.lodash': [this.dep.lodash, this.oldDep.lodash]
						},
						true
					)
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
			dirties: [any, any, boolean][]
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
				step.done &&
					step.done(
						this.ob.proxy,
						this,
						mapObj(this.ctxs, ctx => {
							const d = ctx.dirties[stepIdx]
							return d && ([d[0], d[1]] as [any, any])
						})
					)

				this.checkCollecteds()

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
		eachArray(arguments.length ? arguments : keys(this.ctxs), (path: any) => this.uncollectPath(path))
	}
	stepLabel() {
		const { stepIdx } = this
		const step = this.steps[stepIdx]
		return step && step.name ? step.name : stepIdx + 1
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
						ctx.dirties[stepIdx] = [value, original, false]
						ctx.called++
						//#if _DEBUG
						try {
							console.log(
								format(
									`[{}][{}]: collected dirty, value: {j}, origin: {j}`,
									stepLabel,
									ctx.path,
									value,
									original
								)
							)
						} catch (e) {
							console.error(e)
							// TODO VBProxy not work with json3
						}
						//#endif
					},
					path,
					dirties: [],
					listenId: null
				})

		if (!ctx.listenId) {
			const stepLabel = this.stepLabel()

			try {
				ctx.listenId = __p__++ & 1 ? observe(o, path, ctx.cb, ctx) : ob.observe(path, ctx.cb, ctx)
			} catch (e) {
				e.message = `[${stepLabel}][${path}]: observe failed, ${e.message}`
				throw e
			}
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

			//#if _DEBUG
			console.log(format(`[{}][{}]: observe: {}`, stepLabel, path, ctx.listenId))
			//#endif
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
			//#if _DEBUG
			console.log(format(`[{}][{}]: unobserved: {}`, stepLabel, path, ctx.listenId))
			//#endif
			ctx.listenId = null
		}
	}
	expect(expect: { [path: string]: [any, any?] }, deep?: boolean) {
		const { ctxs, stepIdx } = this
		const stepLabel = this.stepLabel()
		expect = expect || {}
		const EQ = deep ? 'eql' : 'eq'
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
					assert[EQ](d[0], e[0], '[{}][{}]: expect dirty value: {0j} to {1j}', stepLabel, path)
					if (e.length > 1)
						assert[EQ](d[1], e[1], '[{}][{}]: expect origin value: {0j} to {1j}', stepLabel, path)
				}
				d && (d[2] = true)
			})
		} catch (e) {
			throw popErrStack(e, 3)
		}
		return this
	}
	checkCollecteds() {
		const { ctxs, stepIdx } = this
		const stepLabel = this.stepLabel()

		try {
			eachObj(ctxs, (ctx, path) => {
				const d = ctx.dirties[stepIdx]
				assert.is(
					!d || d[2],
					'[{}][{}]: collected the dirty, value: {{[0]}j}, origin: {@{[1]}j}',
					stepLabel,
					path,
					d
				)
			})
		} catch (e) {
			throw popErrStack(e, 3)
		}
	}
}
