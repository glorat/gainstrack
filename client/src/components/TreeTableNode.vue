<template>
    <ol>
    <li v-bind:key="acct.accountId" v-for="acct in node.children" v-bind:class="{toggled: acct.toggled}">
        <p v-if="acct.assetBalance.length>0 && acct.assetBalance.filter(a => (Math.abs(a.number)>0.005)).length>0">
          <span
                  class="account-cell droptarget"
                  v-bind:class="[classObject, (acct.children && acct.children.length>0 ? 'has-children' : '')]"
                  data-account-name={node.name}
                  v-on:click="onToggle(acct)"
          >
            <router-link v-bind:to="'/account/' + acct.name">{{ acct.shortName }}</router-link>
          </span>
            <span class="num other">
                    <span v-for="x in acct.assetBalance">{{x.number.toFixed(2)}} {{x.ccy}} </span>
            </span>
        </p>
        <tree-table-node v-bind:node="acct" v-bind:depth="1+ +depth"></tree-table-node>
    </li>
    </ol>
</template>

<script>
    export default {
        name: 'TreeTableNode',
        props: ['node', 'depth'],
        data() {
            return {toggled: false}
        },
        computed: {
            classObject() {
                const ret = {};
                ret['depth-' + this.depth] = true;
                return ret;
            }
        },
        methods: {
            onToggle(acct) {
                this.$set(acct, 'toggled', !acct.toggled);
            }
        }
    }
</script>

<style scoped>

</style>
