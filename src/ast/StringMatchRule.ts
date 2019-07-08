/**
 * @module utils/AST
 * @author Billow Z <billowz@hotmail.com>
 * @created Tue Dec 11 2018 15:36:42 GMT+0800 (China Standard Time)
 * @modified Mon Apr 08 2019 13:58:56 GMT+0800 (China Standard Time)
 */

import { RuleOptions } from './Rule'
import { RegMatchRule } from './RegMatchRule'
import { escapeReg, mixin, byte } from '../utils'

@mixin({ type: 'String' })
export class StringMatchRule extends RegMatchRule {
	/**
	 * @param name 			match name
	 * @param str 			match string
	 * @param ignoreCase	ignore case
	 * @param options		Rule Options
	 */
	constructor(name: string, str: string, ignoreCase: boolean, options: RuleOptions) {
		super(name, new RegExp(escapeReg(str), ignoreCase ? 'i' : ''), 0, byte(str), options)
		this.setExpr(str)
	}
}
