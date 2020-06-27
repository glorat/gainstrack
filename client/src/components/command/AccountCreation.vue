<template>
    <div>
        <div>
            Account opening date
          <command-date-editor v-model="c.date"></command-date-editor>
        </div>
        <div>
            Account Name

            <el-select v-model="c.accountType" slot="prepend" placeholder="Account Type">
                <el-option
                        v-for="item in ['Assets','Liabilities','Equity','Income','Expenses']"
                        :key="item"
                        :label="item + ':'"
                        :value="item">
                </el-option>
            </el-select>

            <el-input placeholder="Account Name" v-model="c.accountName" class="input-with-select">

            </el-input>


        </div>
        <div>
            Account currency
            <asset-id v-model="c.ccy"></asset-id>
        </div>
        <div>
            <el-switch v-model="c.options.multiAsset" active-text="Multi Asset"></el-switch>
        </div>
        <div>
            <el-switch v-model="c.options.automaticReinvestment" active-text="Automatic Reinvestment"></el-switch>
        </div>
    </div>

</template>

<script>
    import {Input, Option, Select, Switch} from 'element-ui';
    import {CommandEditorMixin} from '../../mixins/CommandEditorMixin';
    import AssetId from '../AssetId';

    export default {
        name: 'AccountCreation',
        components: {
            AssetId,
            'el-select': Select,
            'el-option': Option,
            'el-switch': Switch,
            'el-input': Input,
        },
        mixins: [CommandEditorMixin],
        data() {
            let c = {};
            if (this.cmd) {
                c = {...this.cmd}
            }
            c.date = c.date || new Date().toISOString().slice(0, 10);
            c.ccy = ''; // Default to base currency
            c.accountType = '';
            c.accountName = '';
            c.options = {
                multiAsset: false,
                automaticReinvestment: false
            };
            return {c};
        },
        computed: {
            isValid() {
              return this.c.date && this.c.accountType && this.c.accountName && this.c.ccy;
            },
            dto() {
              if (this.isValid) {
                  return {
                      date: this.c.date,
                      accountId: this.c.accountType + ':' + this.c.accountName,
                      ccy: this.c.ccy,
                      options: this.c.options
                  }
              } else {
                  return undefined;
              }
            },
            toGainstrack() {
                if (this.isValid) {
                    const dto = this.dto;

                    let baseStr = `${dto.date} open ${dto.accountId} ${dto.ccy}`;
                    if (dto.options.multiAsset) {
                        baseStr += '\n  multiAsset: true';
                    }
                    if (dto.options.automaticReinvestment) {
                        baseStr += '\n  automaticReinvestment: true';
                    }
                    return baseStr
                } else {
                    return undefined;
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
