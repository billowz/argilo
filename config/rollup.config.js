const rollupConfig = require('./rollup.config.mk'),
	pkg = require('../package.json')

const banner = `/*
 * ${pkg.name} v${pkg.version}
 * ${pkg.homepage}
 *
 * Copyright (c) 2018 ${pkg.author}
 * Released under the ${pkg.license} license
 *
 * Date: ${new Date().toUTCString()}
 */`

const pkgName = pkg.name.replace(/^@.*\//, ''),
	bundle = pkg.bundle || pkgName.replace(/\./g, '-'),
	namespace = pkg.namespace || pkgName.replace(/[\.-]/g, '_'),
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
			output: {
				format: 'umd',
				name: namespace,
				amd: bundle,
				file: `${bundle}.loose`
			}
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
