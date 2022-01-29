<template>
  <div v-if="type === 'tfr'">
    <transfer :cmd="modelValue" @update:model-value="inputChanged()"
              v-on:gainstrack-changed="gainstrackChanged($event)"
              :options="options"
    ></transfer>
  </div>
  <div v-else-if="type === 'trade'">
    <balance-or-unit :cmd="modelValue" @update:model-value="inputChanged()"
                  v-on:gainstrack-changed="gainstrackChanged($event)"
                  :options="options"
    ></balance-or-unit>
  </div>
  <!-- Not a strict string match so that components can provide an ambiguous type -->
  <div v-else-if="type.match('unit|bal')">
    <balance-or-unit :cmd="modelValue" @update:model-value="inputChanged()"
                  v-on:gainstrack-changed="gainstrackChanged($event)"
                  :options="options"
    ></balance-or-unit>
  </div>
  <div v-else-if="type === 'fund'">
    <fund-command :cmd="modelValue" @update:model-value="inputChanged()"
                  v-on:gainstrack-changed="gainstrackChanged($event)"
                  :options="options"
    ></fund-command>
  </div>
  <div v-else-if="type === 'open'">
    <account-creation :cmd="modelValue" @update:model-value="inputChanged()"
                      v-on:gainstrack-changed="gainstrackChanged($event)"
                      :options="options"
    ></account-creation>
  </div>
  <div v-else-if="type === 'earn'">
    <earn-editor :cmd="modelValue" @update:model-value="inputChanged()"
                 v-on:gainstrack-changed="gainstrackChanged($event)"
                 :options="options"
    ></earn-editor>
  </div>
  <div v-else-if="type === 'spend'">
    <spend-editor :cmd="modelValue" @update:model-value="inputChanged()"
                  v-on:gainstrack-changed="gainstrackChanged($event)"
                  :options="options"
    ></spend-editor>
  </div>
  <div v-else-if="type === 'yield'">
    <yield-editor :cmd="modelValue" @update:model-value="inputChanged()"
                  v-on:gainstrack-changed="gainstrackChanged($event)"
                  :options="options"
    ></yield-editor>
  </div>
  <div v-else-if="type === 'C'">
    C
  </div>
  <div v-else>
    Editor for {{type}} is under construction
  </div>
</template>

<script>
  import Transfer from './command/Transfer'
  import FundCommand from './command/FundCommand'
  import AccountCreation from './command/AccountCreation'
  import EarnEditor from './command/EarnEditor'
  import YieldEditor from './command/YieldEditor'
  import SpendEditor from '../components/command/SpendEditor'
  import BalanceOrUnit from 'components/command/BalanceOrUnit'

  export default {
    name: 'CommandEditor',
    components: {
      YieldEditor,
      SpendEditor,
      EarnEditor,
      FundCommand,
      Transfer,
      AccountCreation,
      BalanceOrUnit
    },
    methods: {
      gainstrackChanged (str) {
        this.$emit('gainstrack-changed', str)
      },
      inputChanged () {
        this.$emit('update:modelValue', this.input)
      },
    },
    computed: {
      type () {
        return this.modelValue.commandType
      }
    },
    props: { modelValue: Object, options: Object },
  }
</script>

<style>
  .command-editor .input {
    padding: 1px 10px;
  }
</style>
