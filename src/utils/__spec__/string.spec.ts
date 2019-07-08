import { trim, escapeStr, upperFirst, lowerFirst } from '../string'
import { assert } from '../../assert'

describe('utils/string', () => {
	it('trim', () => {
		assert.eq(trim(''), '')
		assert.eq(trim(' '), '')
		assert.eq(trim('   '), '')
		assert.eq(trim('a  '), 'a')
		assert.eq(trim('  a'), 'a')
		assert.eq(trim('  a  '), 'a')
	})

	it('escapeStr', () => {
		assert.eq(escapeStr('\n\t\f"\''), '\\n\\t\\f\\"\\\'')
	})
	it('case', () => {
		assert.eq(upperFirst('abc'), 'Abc')
		assert.eq(lowerFirst('ABC'), 'aBC')
	})
})
