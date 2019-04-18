const baseCfg = require('./karma.config')

module.exports = function(config) {
	baseCfg(config)
	process.env.NODE_ENV = 'perf'
	config.set({
		frameworks: ['benchmark'],
		reporters: ['benchmark'],
		singleRun: true,
		files: baseCfg.polyfills.concat(
			(config.specs && typeof config.specs === 'string' ? config.specs : '*')
				.split(',')
				.map(v => `src/**/${v}.perf.ts`)
		),
		preprocessors: {
			[`src/**/*.perf.ts`]: ['rollup']
		},
		benchmarkReporter: {
			colors: config.colors
		},
		junitReporter: {
			outputDir: 'benchmark',
			outputFile: 'benchmark.xml'
		},
		browserNoActivityTimeout: 10 * 60 * 1000
	})
}
