const commitAnalyzer = [
	'@semantic-release/commit-analyzer',
	{
		preset: 'angular',
		releaseRules: [
			{
				type: 'build',
				scope: 'release',
				release: 'major'
			},
			{
				type: 'docs',
				scope: 'README',
				release: 'patch'
			},
			{
				type: 'refactor',
				scope: '/core-.*/',
				release: 'minor'
			},
			{
				type: 'refactor',
				release: 'patch'
			}
		],
		parserOpts: {
			noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES']
		}
	}
]
module.exports = {
	branches: [
		'+([1-9])?(.{+([1-9]),x}).x',
		'master',
		{
			name: 'alpha',
			channel: 'alpha',
			prerelease: 'alpha'
		}
	],
	plugins: process.env.prerelease
		? [commitAnalyzer]
		: [
				commitAnalyzer,
				'@semantic-release/changelog',
				'@semantic-release/release-notes-generator',
				'@semantic-release/npm',
				[
					'@semantic-release/git',
					{
						assets: ['CHANGELOG.md']
					}
				],
				[
					'@semantic-release/github',
					{
						assets: []
					}
				]
		  ]
}
