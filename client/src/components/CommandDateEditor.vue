<template>
    <q-input class="c-date" dense :modelValue="dateObj" @update:modelValue="onDateChanged($event)"
             :label="label || 'Date'" mask="date" :rules="['date']">
        <template v-slot:append>
            <q-icon :name="matEvent" class="cursor-pointer">
                <q-popup-proxy ref="qDateProxy" transition-show="scale" transition-hide="scale">
                    <q-date :modelValue="dateObj" @update:modelValue="(ev) => { qDateProxy?.hide(); onDateChanged(ev) }" />
                </q-popup-proxy>
            </q-icon>
        </template>
    </q-input>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { matEvent } from '@quasar/extras/material-icons';
import { date, QPopupProxy } from 'quasar';

const props = defineProps<{ modelValue?: string; label?: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const qDateProxy = ref<InstanceType<typeof QPopupProxy> | null>(null);

function fromISO(dt: string) {
    const s = dt ? dt.split(/\D/).map(x => parseInt(x)) : [];
    if (s[0] && s[1] && s[2]) {
        return new Date(+s[0], --s[1], +s[2], 0, 0, 0, 0);
    } else {
        return undefined;
    }
}

function reformatIsoDate(dt: string, format: string) {
    return date.formatDate(fromISO(dt), format);
}

function onDateChanged(ev: string | number | null) {
    const myDate = ev ? reformatIsoDate(String(ev), 'YYYY-MM-DD') : '';
    emit('update:modelValue', myDate);
}

const dateObj = computed(() => reformatIsoDate(props.modelValue || '', 'YYYY/MM/DD'));
</script>

<style scoped>

</style>
