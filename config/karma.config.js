const path = require('path'),
	json = require('rollup-plugin-json'),
	rollupConfig = require('./rollup.config.mk'),
	istanbul = require('rollup-plugin-istanbul'),
	pkg = require('../package.json')

const CI = process.env.CI,
	pkgName = pkg.name.replace(/^@.*\//, ''),
	namespace = pkg.namespace || pkgName.replace(/[\.-]/g, '_')

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
	const coverage = typeof config.coverage === 'string' ? config.coverage.split(/\s*,\s*/g) : config.coverage && ['lcov']

	config.set({
		browsers: ['Chrome'],
		transports: ['websocket', 'polling', 'jsonp-polling'],
		frameworks: ['mocha'],
		reporters: coverage ? ['spec', 'coverage-istanbul'] : ['spec'],
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
				plugins: [],
				progress: !CI,
				sourcemap: 'inline',
				output: {
					format: 'iife',
					name: namespace
				},
				plugins: [
					json(),
					coverage &&
						istanbul({
							include: ['src/**/*.js', 'src/**/*.ts'],
							exclude: ['src/**/__*__/**']
						})
				]
			}),
			transformPath(filepath) {
				return filepath.replace(/\.ts$/, '.js')
			}
		},
		coverageIstanbulReporter: {
			dir: 'coverage/%browser%',
			reports: coverage,
			combineBrowserReports: false,
			skipFilesWithNoCoverage: false
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
