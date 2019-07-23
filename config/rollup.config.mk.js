const path = require('path'),
	nodeResolve = require('rollup-plugin-node-resolve'),
	commonjs = require('rollup-plugin-commonjs'),
	jscc = require('rollup-plugin-jscc'),
	typescript = require('rollup-plugin-typescript'),
	terser = require('rollup-plugin-terser').terser,
	visualizer = require('rollup-plugin-visualizer'),
	istanbul = require('rollup-plugin-istanbul'),
	progress = require('rollup-plugin-progress'),
	filesize = require('rollup-plugin-filesize')

const CI = process.env.CI

const configOptions = mkMap(
	'target,debug,compact,strict,sourcemap,sourceRoot,outDir,extensions,banner,footer,progress,codeAnalysis'
)

/**
 * @param {*}					config...								rollup configuration
 * @param {string}				[config.outDir='.']						output dir
 * @param {"es3"|"es5"|"es6"} 	[config.target="es3"]					config target
 * @param {boolean}				[config.strict=true]					use strict
 * @param {boolean}				[config.debug=false]					debug mode
 * @param {*}					[config.compact=false]					compact bundle
 * @param {boolean}				[config.sourcemap=true]					enable source map
 * @param {string}				config.sourceRoot						root path of source map
 * @param {string[]}			[config.extensions=[".js",".ts"]]		file extensions
 * @param {*}					config.macros							plain object defining the variables used by jscc during the preprocessing
 * @param {string}				config.banner							banner
 * @param {string}				config.footer							banner
 * @param {boolean}				[config.progress=true]					show progress
 * @param {string}				config.codeAnalysis						code analysis file
 */
function mkConfig(config) {
	const target = (config.target || 'es3').toLowerCase(),
		debug = !!config.debug,
		extensions = config.extensions || ['.js', '.ts'],
		banner = config.banner,
		footer = config.footer,
		sourcemap = config.sourcemap === undefined ? true : config.sourcemap,
		compact = config.compact,
		codeAnalysis =
			config.codeAnalysis && (typeof config.codeAnalysis === 'string' ? config.codeAnalysis : 'analysis.html')

	const rollupOptions = assignBy({}, k => !configOptions[k], config, {
		output: (Array.isArray(config.output) ? config.output : [config.output])
			.filter(o => !!o)
			.map(output => {
				const amdModule = /^(?:amd|umd)$/.test(output.format),
					amd =
						amdModule && (!output.amd || typeof output.amd !== 'object')
							? { id: output.amd || output.name }
							: undefined,
					file =
						output.file &&
						path.join(
							config.outDir || '.',
							!/\.js$/.test(output.file)
								? `${output.file}${debug ? '.dev' : ''}${compact ? '.min' : ''}.js`
								: output.file
						),
					sourceRoot =
						typeof output.sourceRoot === 'string'
							? output.sourceRoot
							: typeof config.sourceRoot === 'string'
							? config.sourceRoot
							: amdModule
							? `/${amd.id}`
							: output.name && `/${output.name}`,
					sourcemapPathTransform = output.sourcemapPathTransform

				return Object.assign(
					{
						banner,
						footer,
						sourcemap,
						strict: config.strict !== false,
						esModule: target !== 'es3',
						freeze: target !== 'es3',
						compact: !!compact
					},
					output,
					{
						amd,
						file,
						sourceRoot: undefined,
						sourcemapPathTransform(p) {
							if (sourceRoot) {
								p = path.join(sourceRoot, p.replace(/^(?:\.\.[\/\\])+/, ''))
							}
							return sourcemapPathTransform ? sourcemapPathTransform(p) : p
						}
					}
				)
			})
	})

	if (rollupOptions.output.length <= 1) rollupOptions.output = rollupOptions.output[0]

	return Object.assign({}, rollupOptions, {
		plugins: [
			nodeResolve({ mainFields: ['module', 'main'], extensions }),
			commonjs(),
			jscc({
				sourceMap: false,
				values: Object.assign({ _TARGET: target, _DEBUG: debug }, config.macros)
			}),
			typescript({ module: 'ESNext', target })
		]
			.concat(rollupOptions.plugins || [])
			.concat([
				compact &&
					terser(
						Object.assign(
							{
								warnings: true,
								sourcemap: !!sourcemap,
								ie8: target === 'es3',
								mangle: {
									properties: {
										regex: /^__\w*[^_]$/
									}
								}
							},
							compact,
							{
								compress: Object.assign(
									{
										passes: 1,
										toplevel: true,
										typeofs: false
									},
									compact.compress
								)
							}
						)
					),
				!CI &&
					codeAnalysis &&
					visualizer({
						filename: codeAnalysis.replace(/\.html$/, '') + '.html',
						sourcemap: !!sourcemap
					}),
				!CI && config.progress !== false && progress(),
				filesize()
			])
			.filter(p => !!p && (!Array.isArray(p) || !!p[0]))
			.sort((p1, p2) => ((Array.isArray(p1) && p1[1]) || 0) - ((Array.isArray(p2) && p2[1]) || 0))
			.map(p => (Array.isArray(p) ? p[0] : p))
	})
}
module.exports = mkConfig

function assignBy(target = {}, filter) {
	for (let i = 2, l = arguments.length; i < l; i++) {
		const o = arguments[i]
		if (o) {
			for (const k in o) {
				if (Object.prototype.hasOwnProperty.call(o, k) && filter(k, target, o)) {
					target[k] = o[k]
				}
			}
		}
	}
	return target
}

function mkMap(str) {
	const map = {}
	str.split(/\s*,\s*/g).forEach(v => {
		map[v] = true
	})
	return map
}
