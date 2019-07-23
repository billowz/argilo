import { trim, escapeStr, upperFirst, lowerFirst } from '../string'
import { assert } from '../../assert'
import { toStr, toStrType } from '../toStr'

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
	it('toStr', () => {
		assert.eq(toStr('abc'), '[object String]')
	})
	it('toStrType', () => {
		assert.eq(toStrType('abc'), 'String')
	})
})
