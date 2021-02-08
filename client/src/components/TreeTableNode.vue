<template>
    <ol>
    <li v-bind:key="acct.name" v-for="acct in node.children" v-bind:class="{toggled: toggled[acct.name]}">
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


<script lang="ts">
    import Vue from 'vue';
    import { mapGetters } from 'vuex';
    import {TreeTableDTO} from 'src/lib/assetdb/models';

    export default Vue.extend({
        name: 'TreeTableNode',
        props: {
          node: Object as () => TreeTableDTO,
          depth: Number
        },
        data(): {toggled: Record<string, boolean>} {
          const ret: {toggled: Record<string, boolean>} = {
                toggled: this.node.children.reduce((map: Record<string, boolean>, obj) => {
                    map[obj.name] = this.$store.getters.mainAccounts.includes(obj.name);
                    return map;
                }, {}),
            };
          return ret;
        },
        computed: {
            classObject(): Record<string, any> {
                const ret: Record<string, any> = {};
                ret['depth-' + this.depth] = true;
                return ret;
            },
            ...mapGetters(['mainAccounts']),
        },
        methods: {
            onToggle(acct: TreeTableDTO) {
                this.$set(this.toggled, acct.name, !this.toggled[acct.name]);
            }
        }
    })
</script>

<style scoped>

</style>
