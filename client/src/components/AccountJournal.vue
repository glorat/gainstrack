<template>
  <div>
    <div v-if="c.commandType">
      <add-cmd :modelValue="c" :command-columns="commandTableColumns" @cancel="addCancel" has-cancel></add-cmd>
    </div>
    <div v-if="!c.commandType">
      Add Entry
      <span v-for="cmd in scopedCommands" :key="cmd.prefix"><button @click="setupCommand(cmd)"
                                                                    :tag="cmd.prefix"
                                                                    :title="cmd.description">{{ cmd.title }}</button></span>
    </div>
    <h5>Existing entries</h5>
    <command-table :cmds="displayCommands" :columns="commandTableColumns"></command-table>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import AddCmd from '../pages/AddCmd.vue';
import CommandTable from '../components/CommandTable.vue';
import {AccountCommandDTO} from '../lib/assetdb/models';
import {CommandConfig, commands, defaultCommand} from '../config/commands';
import {useAppStore} from 'src/stores';

const props = defineProps<{ accountId: string }>();

const store = useAppStore();

const c = ref<AccountCommandDTO>({} as AccountCommandDTO);

function setupCommand(cmd: CommandConfig): void {
  c.value = defaultCommand({accountId: props.accountId, commandType: cmd.prefix});
}

function addCancel(): void {
  c.value = {} as AccountCommandDTO;
}


const myCommands = computed((): AccountCommandDTO[] => {
  const cmds = store.allState.commands;
  return cmds.filter((cmd: any) => cmd.accountId == props.accountId).reverse();
});

const scopedCommands = computed((): CommandConfig[] => {
  const acct = store.findAccount(props.accountId);
  return commands.filter(cmd => acct && cmd.appliesTo(acct));
});

const displayCommands = computed((): AccountCommandDTO[] => {
  const cmds = myCommands.value;
  if (c.value.commandType) {
    return cmds.filter(cmd => cmd.commandType === c.value.commandType);
  } else {
    return cmds;
  }
});

const commandTableColumns = computed((): string[] => {
  if (c.value.commandType) {
    const cfg = commands.find(cmd => cmd.prefix === c.value.commandType);
    const cols = cfg ? [...cfg.columns, 'date', 'description'] : [];
    return cols;
  } else {
    return [];
  }
});
</script>

<style scoped>

</style>
