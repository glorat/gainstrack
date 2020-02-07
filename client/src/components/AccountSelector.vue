<template>
    <el-select
            :value="value"
            v-on:input="onSelectChanged($event)"
            filterable
            size="mini"
            :placeholder="resolvedPlaceholder">
        <el-option
                v-for="item in options"
                :key="item.value"
                :label="item.label"
                :value="item.value">
        </el-option>
    </el-select>
</template>

<script>
    import {Select, Option} from 'element-ui';

    export default {
        name: 'AccountSelector',
        components: {'el-select': Select, 'el-option': Option},
        props: {value: String, accountList: Array, placeholder: String},
        data() {
            return {
                // items: this.$store.state.summary.accountIds
            }
        },
        computed: {
            resolvedPlaceholder() {
              return this.placeholder || 'Account';
            },
            accounts() {
                return this.accountList || this.$store.state.summary.accountIds;
            },
            options() {
                return this.accounts.map(acctId => {
                    return {value: acctId, label: acctId};
                });
            }
        },
        methods: {
            onChanged(ev) {
                this.$emit('input', ev.target.value);
            },
            onSelectChanged(ev) {
                this.$emit('input', ev);
            }
        }
    }
</script>

<style scoped>

</style>