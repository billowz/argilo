const rollupConfig = require('./rollup.config.mk'),
	pkg = require('../package.json')

const banner = `/*
 *    __ _ _ __ __ _(_) | ___
 *   / _\` | '__/ _\` | | |/ _ \\
 *  | (_| | | | (_| | | | (_) |
 *   \\__,_|_|  \\__, |_|_|\\___/
 *             |___/
 *
 * ${pkg.name} v${pkg.version}
 * ${pkg.homepage}
 *
 * Copyright (c) 2018 ${pkg.author}
 * Released under the ${pkg.license} license
 *
 * Date: ${new Date().toUTCString()}
 */`

const bundle = pkg.bundle || pkg.name,
	namespace = pkg.namespace || pkg.name,
	baseCfg = {
		outDir: 'dist',
		input: 'src/index.ts',
		banner,
		sourceRoot: '/' + bundle,
		external: Object.keys(pkg.dependencies || {})
	},
	looseConfig = Object.assign(
		{
			target: 'es3',
			output: [
				{
					format: 'umd',
					name: namespace,
					amd: bundle,
					file: `${bundle}.loose`
				},
				{
					format: 'esm',
					file: `${bundle}.loose.esm`
				}
			]
		},
		baseCfg
	),
	moduleConfig = Object.assign(
		{
			target: 'es5',
			output: [
				{
					format: 'umd',
					name: namespace,
					amd: bundle,
					file: bundle
				},
				{
					format: 'esm',
					file: `${bundle}.esm`
				}
			]
		},
		baseCfg
	)

module.exports = [Object.assign({ debug: true }, moduleConfig), Object.assign({ debug: true }, looseConfig)]
	.concat(
		process.env.NODE_ENV === 'production' && [
			moduleConfig,
			looseConfig,
			Object.assign({ compact: true, codeAnalysis: `analysis/${bundle}` }, moduleConfig),
			Object.assign({ compact: true, codeAnalysis: `analysis/${bundle}.loose` }, looseConfig)
		]
	)
	.filter(cfg => cfg)
	.map(cfg => rollupConfig(cfg))
