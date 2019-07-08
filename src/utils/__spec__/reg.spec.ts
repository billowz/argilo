import { escapeReg } from '../reg'
import { assert } from '../../assert'

describe('utils/reg', () => {
	it('escapeReg', () => {
		assert.eq(escapeReg('/\\$?+*[]{}'), '\\/\\\\\\$\\?\\+\\*\\[\\]\\{\\}')
	})
})
