<template>
    <ol v-if="node">
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


<script setup lang="ts">
import { computed, ref } from 'vue';
import {useAppStore} from 'src/stores';
import {TreeTableDTO} from 'src/lib/assetdb/models';

const props = defineProps<{
  node?: TreeTableDTO
  depth: number
}>();

const store = useAppStore();

const toggled = ref<Record<string, boolean>>(
  props.node?.children.reduce((map: Record<string, boolean>, obj) => {
    map[obj.name] = store.mainAccounts.includes(obj.name);
    return map;
  }, {}) ?? {}
);

const classObject = computed((): Record<string, any> => {
  const ret: Record<string, any> = {};
  ret['depth-' + props.depth] = true;
  return ret;
});

function onToggle(acct: TreeTableDTO) {
  toggled.value[acct.name] = !toggled.value[acct.name];
}
</script>

<style scoped>

</style>
