<template>
    <table class="queryresults sortable">
        <thead>
        <tr>
            <th v-if="columnShow['accountId']" data-sort="string">account</th>
            <th data-sort="string">date</th>
            <th v-if="columnShow['commandType']" data-sort="string">type</th>
            <th v-if="columnShow['asset']">asset</th>
            <th v-if="columnShow['change']">change</th>
            <th v-if="columnShow['price']">price</th>
            <th v-if="columnShow['commission']">commission</th>
            <th v-if="columnShow['balance']">balance</th>
            <th v-if="columnShow['otherAccount']">other account</th>
            <th data-sort="string">description</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="cmd in cmds" v-on:click="selectCommand(cmd)">
            <!--            <td colspan="4"><command-editor :cmd="cmd.data" :type="cmd.type"></command-editor></td>-->
            <td v-if="columnShow['accountId']">{{ cmd.accountId }}</td>
            <td>{{ cmd.date }}</td>
            <td v-if="columnShow['commandType']">{{ cmd.commandType }}</td>
            <td v-if="columnShow['asset']">{{ cmd.asset }}</td>
            <td v-if="columnShow['change']" class="num">{{ cmd.change | amount }}</td>
            <td v-if="columnShow['price']" class="num">{{ cmd.price | amount }}</td>
            <td v-if="columnShow['commission']" class="num">{{ cmd.commission | amount }}</td>
            <td v-if="columnShow['balance']" class="num">{{ cmd.balance | amount }}</td>
            <td v-if="columnShow['otherAccount']">{{ cmd.otherAccount }}</td>
            <td>{{ cmd.description }}</td>
        </tr>
        </tbody>
    </table>
</template>

<script lang="ts">
  import {AccountCommandDTO, Amount} from '../models';
  import Vue, {PropType} from 'vue';

    export default Vue.extend({
        name: 'CommandTable',
        props: {
            cmds: Array as PropType<AccountCommandDTO[]>,
            columns: {
                type: Array as PropType<string[]>,
                // default: () => [],
            },
        },
        filters: {
            amount(value: Amount) {
                if (!value) {
                    return ''
                } else {
                    return `${value.number} ${value.ccy}`
                }

            }
        },
        methods: {
            selectCommand() {
                // TODO
            },
        },
        computed: {
            columnShow(): Record<string, boolean> {
                const cols = ['accountId', 'date', 'commandType', 'price', 'change', 'asset', 'commission', 'balance',
                    'otherAccount', 'description'];
                const map: Record<string, boolean> = {};
                const show = this.columns.length > 0 ? this.columns : cols;
                show.forEach(s => {
                    map[s] = true;
                });
                return map;
            }
        }
    })
</script>

<style scoped>

</style>
