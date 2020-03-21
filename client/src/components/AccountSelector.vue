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

<script lang="ts">
    import Vue from 'vue';
    import {Select, Option} from 'element-ui';

    export default Vue.extend({
        name: 'AccountSelector',
        components: {'el-select': Select, 'el-option': Option},
        props: {
            value: String,
            accountList: Array as () => string[],
            placeholder: String
        },
        data() {
            return {
                // items: this.$store.state.summary.accountIds
            };
        },
        computed: {
            resolvedPlaceholder(): string {
                return this.placeholder || 'Account';
            },
            accounts(): string[] {
                return this.accountList || this.$store.state.summary.accountIds;
            },
            options(): object {
                return this.accounts.map(acctId => {
                    return {value: acctId, label: acctId};
                });

            }
        },
        methods: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onChanged(ev: any) {
                this.$emit('input', ev.target.value);
            },
            onSelectChanged(ev: string) {
                this.$emit('input', ev);
            }
        }
    });
</script>

<style scoped>

</style>
