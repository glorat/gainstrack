/* eslint-disable */
/**
 * @jest-environment jsdom
 */

import { mount, createLocalVue, shallowMount } from '@vue/test-utils'
import { parentAccountIdOf, postingsToPositionSet } from 'src/lib/utils'


describe('Utils', () => {
  describe('postingsToPositionSet', () => {
    it('handles nothing', () => {
      const ps = [];
      const ret = postingsToPositionSet(ps)
      expect(ret).toStrictEqual({})
    })

    it('adds something to nothing', () => {
      const ps = [{account:'A', value:{number:100, ccy:'USD'}}];
      const ret = postingsToPositionSet(ps)
      expect(ret).toStrictEqual({'USD': 100})
    })

    it('adds something to something else', () => {
      const ps = [
        {account:'A', value:{number:100, ccy:'USD'}},
        {account:'A', value:{number:200, ccy:'GBP'}},
        {account:'A', value:{number:300, ccy:'GBP'}},
        ];
      const ret = postingsToPositionSet(ps)
      expect(ret).toStrictEqual({'USD': 100, 'GBP': 500})
    })
  })

  describe('parentAccountIdOf', () => {
    it ('handles empty', () => {
      expect(parentAccountIdOf('')).toStrictEqual('')
    })

    it ('top-level', () => {
      expect(parentAccountIdOf('Assets')).toStrictEqual('')
    })

    it ('handles sub-level', () => {
      expect(parentAccountIdOf('Assets:Foo')).toStrictEqual('Assets')
      expect(parentAccountIdOf('Assets:Foo:Bar')).toStrictEqual('Assets:Foo')
    })
  })


})
