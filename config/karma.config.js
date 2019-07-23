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
		pattern: 'node_modules/json3/lib/json3.js',
		watched: false
	},
	{
		pattern: 'node_modules/console-polyfill/index.js',
		watched: false
	}
]

const commaReg = /\s*,\s*/g

module.exports = function(config) {
	const coverage = typeof config.coverage === 'string' ? config.coverage.split(commaReg) : config.coverage && ['lcov']

	config.set({
		browsers: ['Chrome'],
		transports: ['websocket', 'polling', 'jsonp-polling'],
		frameworks: ['mocha'].concat(config.sourcemap !== false ? ['source-map-support'] : []),
		reporters: coverage ? ['spec', 'coverage-istanbul'] : ['spec'],
		basePath: path.join(__dirname, '../'),
		files: polyfills
			.concat(
				(config.specs && typeof config.specs === 'string' ? config.specs : '**/*')
					.split(commaReg)
					.map(v => `src/${v}.spec.ts`)
			)
			.concat(coverage ? ['src/index.ts'] : []),
		preprocessors: {
			'src/**/*.ts': ['rollup']
		},
		rollupPreprocessor: {
			options: rollupConfig({
				target: config.target || 'es5',
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
				],
				debug: config.debug === true
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
