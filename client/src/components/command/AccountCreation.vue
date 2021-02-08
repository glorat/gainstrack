<template>
  <div>
    <div>
      <command-date-editor v-model="c.date" label="Account Opening Date"></command-date-editor>
    </div>
    <div>
      <q-select v-model="c.accountType" :options="['Assets','Liabilities','Equity','Income','Expenses']"
                label="Account Type"/>
      <q-input label="Account Name" v-model="c.accountName"></q-input>
    </div>
    <div>
      <asset-id v-model="c.ccy" label="Account Currency"></asset-id>
    </div>
    <div>
      <q-toggle
        v-model="c.options.multiAsset"
        label="Multi Asset"
      />
    </div>
    <div>
      <q-toggle v-model="c.options.automaticReinvestment" label="Automatic Reinvestment"/>
    </div>
  </div>

</template>

<script>
  import { CommandEditorMixin } from '../../mixins/CommandEditorMixin'
  import AssetId from '../../lib/assetdb/components/AssetId'

  export default {
    name: 'AccountCreation',
    components: {
      AssetId,
    },
    mixins: [CommandEditorMixin],
    data () {
      let c = {}
      if (this.cmd) {
        c = { ...this.cmd }
      }
      c.date = c.date || new Date().toISOString().slice(0, 10)
      c.ccy = '' // Default to base currency
      c.accountType = ''
      c.accountName = ''
      c.options = {
        multiAsset: false,
        automaticReinvestment: false
      }
      return { c }
    },
    computed: {
      isValid () {
        return this.c.date && this.c.accountType && this.c.accountName && this.c.ccy
      },
      dto () {
        if (this.isValid) {
          return {
            date: this.c.date,
            accountId: this.c.accountType + ':' + this.c.accountName,
            ccy: this.c.ccy,
            options: this.c.options
          }
        } else {
          return undefined
        }
      },
      toGainstrack () {
        if (this.isValid) {
          const dto = this.dto

          let baseStr = `${dto.date} open ${dto.accountId} ${dto.ccy}`
          if (dto.options.multiAsset) {
            baseStr += '\n  multiAsset: true'
          }
          if (dto.options.automaticReinvestment) {
            baseStr += '\n  automaticReinvestment: true'
          }
          return baseStr
        } else {
          return undefined
        }

      }
    }
  }
</script>

<style scoped>
  .el-input-group__prepend div.el-select .el-input__inner {
    width: fit-content;
  }
</style>
