import { shallowMount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CommandEditor from 'src/components/CommandEditor.vue'
import Transfer from 'src/components/command/Transfer.vue'

describe('CommandEditor', () => {
  // Bug #8: the template binds @update:modelValue="inputChanged()" with no argument,
  // so inputChanged() emits props.modelValue (the unchanged original) instead of
  // forwarding whatever the child emitted.
  test('v-model forwards the child\'s new DTO, not the stale original prop', async () => {
    const original = { commandType: 'tfr', accountId: 'Assets:Old', date: '2024-01-01' }
    const childUpdate = { commandType: 'tfr', accountId: 'Assets:New', date: '2024-01-01' }

    const wrapper = shallowMount(CommandEditor, {
      props: { modelValue: original }
    })

    // The Transfer child emits a new DTO; CommandEditor must forward it, not re-emit the prop
    const transferStub = wrapper.findComponent(Transfer)
    await transferStub.vm.$emit('update:modelValue', childUpdate)
    await nextTick()

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toEqual(childUpdate)
  })
})
