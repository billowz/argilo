const path = require('path'),
	json = require('rollup-plugin-json'),
	rollupConfig = require('./rollup.config.mk'),
	pkg = require('../package.json')

const CI = process.env.CI,
	namespace = pkg.namespace || pkg.name

const polyfills = [
	{
		pattern: 'node_modules/json3/lib/json3.min.js',
		watched: false
	},
	{
		pattern: 'node_modules/console-polyfill/index.js',
		watched: false
	}
]

module.exports = function(config) {
	if (config.coverage) {
		process.env.NODE_ENV = 'test'
	}
	config.set({
		browsers: ['Chrome'],
		transports: ['websocket', 'polling', 'jsonp-polling'],
		frameworks: ['mocha'],
		reporters: config.coverage ? ['spec', 'coverage'] : ['spec'],
		basePath: path.join(__dirname, '../'),
		files: polyfills
			.concat(['src/index.ts'])
			.concat(
				(config.specs && typeof config.specs === 'string' ? config.specs : '*')
					.split(',')
					.map(v => `src/**/${v}.spec.ts`)
			),
		preprocessors: {
			'src/**/*.ts': ['rollup']
		},
		rollupPreprocessor: {
			options: rollupConfig({
				plugins: [json()],
				progress: !CI,
				sourcemap: !CI && 'inline',
				output: {
					format: 'iife',
					name: namespace
				}
			}),
			transformPath(filepath) {
				return filepath.replace(/\.ts$/, '.js')
			}
		},
		coverageReporter: {
			dir: 'coverage/',
			reporters:
				typeof config.coverage === 'string'
					? config.coverage.split(',').map(type => ({ type }))
					: [
							{
								type: 'lcov'
							}
					  ]
		},
		customLaunchers: {
			IE9: {
				base: 'IE',
				displayName: 'IE9',
				'x-ua-compatible': 'IE=EmulateIE9'
			},
			IE8: {
				base: 'IE',
				displayName: 'IE8',
				'x-ua-compatible': 'IE=EmulateIE8'
			},
			IE7: {
				base: 'IE',
				displayName: 'IE7',
				'x-ua-compatible': 'IE=EmulateIE7'
			},
			IE6: {
				base: 'IE',
				displayName: 'IE6',
				'x-ua-compatible': 'IE=EmulateIE6'
			}
		},
		singleRun: !!CI,
		concurrency: Infinity,
		colors: true,
		client: {
			useIframe: config.iframe !== false,
			runInParent: config.iframe === false,
			captureConsole: false,
			mocha: {
				reporter: 'html',
				ui: 'bdd'
			}
		},
		plugins: ['karma-*']
	})
}
module.exports.polyfills = polyfills
