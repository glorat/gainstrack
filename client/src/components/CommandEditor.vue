<template>
  <div v-if="type === 'tfr'">
    <transfer :cmd="modelValue" @update:modelValue="inputChanged()"
              v-on:gainstrack-changed="gainstrackChanged($event)"
              :options="options"
    ></transfer>
  </div>
  <div v-else-if="type === 'trade'">
    <balance-or-unit :cmd="modelValue" @update:modelValue="inputChanged()"
                  v-on:gainstrack-changed="gainstrackChanged($event)"
                  :options="options"
    ></balance-or-unit>
  </div>
  <!-- Not a strict string match so that components can provide an ambiguous type -->
  <div v-else-if="type.match('unit|bal')">
    <balance-or-unit :cmd="modelValue" @update:modelValue="inputChanged()"
                  v-on:gainstrack-changed="gainstrackChanged($event)"
                  :options="options"
    ></balance-or-unit>
  </div>
  <div v-else-if="type === 'fund'">
    <fund-command :cmd="modelValue" @update:modelValue="inputChanged()"
                  v-on:gainstrack-changed="gainstrackChanged($event)"
                  :options="options"
    ></fund-command>
  </div>
  <div v-else-if="type === 'open'">
    <account-creation :cmd="modelValue" @update:modelValue="inputChanged()"
                      v-on:gainstrack-changed="gainstrackChanged($event)"
                      :options="options"
    ></account-creation>
  </div>
  <div v-else-if="type === 'earn'">
    <earn-editor :cmd="modelValue" @update:modelValue="inputChanged()"
                 v-on:gainstrack-changed="gainstrackChanged($event)"
                 :options="options"
    ></earn-editor>
  </div>
  <div v-else-if="type === 'spend'">
    <spend-editor :cmd="modelValue" @update:modelValue="inputChanged()"
                  v-on:gainstrack-changed="gainstrackChanged($event)"
                  :options="options"
    ></spend-editor>
  </div>
  <div v-else-if="type === 'yield'">
    <yield-editor :cmd="modelValue" @update:modelValue="inputChanged()"
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

<script setup lang="ts">
import Transfer from './command/Transfer.vue'
import FundCommand from './command/FundCommand.vue'
import AccountCreation from './command/AccountCreation.vue'
import EarnEditor from './command/EarnEditor.vue'
import YieldEditor from './command/YieldEditor.vue'
import SpendEditor from '../components/command/SpendEditor.vue'
import BalanceOrUnit from 'components/command/BalanceOrUnit.vue'
import { computed } from 'vue'
import type { AccountCommandDTO } from 'src/lib/assetdb/models'

const props = defineProps<{
  modelValue: Partial<AccountCommandDTO>
  options?: Record<string, unknown>
}>()

const emit = defineEmits<{
  'gainstrack-changed': [str: string]
  'update:modelValue': [val: Partial<AccountCommandDTO>]
}>()

const type = computed(() => props.modelValue.commandType ?? '')

function gainstrackChanged(str: string) {
  emit('gainstrack-changed', str)
}

function inputChanged() {
  emit('update:modelValue', props.modelValue)
}
</script>

<style>
  .command-editor .input {
    padding: 1px 10px;
  }
</style>
