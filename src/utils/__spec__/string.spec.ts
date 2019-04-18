import { trim, escapeStr } from '../string'
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
})
