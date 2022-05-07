<template>
    <q-input class="c-date" dense :modelValue="dateObj" @update:modelValue="onDateChanged($event)"
             :label="label || 'Date'" mask="date" :rules="['date']">
        <template v-slot:append>
            <q-icon :name="matEvent" class="cursor-pointer">
                <q-popup-proxy ref="qDateProxy" transition-show="scale" transition-hide="scale">
                    <q-date :modelValue="dateObj" @update:modelValue="(ev) => {$refs.qDateProxy.hide(); onDateChanged(ev)}" />
                </q-popup-proxy>
            </q-icon>
        </template>
    </q-input>
</template>

<script lang="ts">
    import {defineComponent} from 'vue';
    import {matEvent} from '@quasar/extras/material-icons';
    import {date} from 'quasar';

    function fromISO(dt:string) {
        const s = dt ? dt.split(/\D/).map(x => parseInt(x)) : [];
        if (s[0] && s[1] && s[2]) {
            return new Date(+s[0], --s[1], +s[2],  0, 0, 0, 0)
        } else {
            return undefined
        }
    }

    function reformatIsoDate(dt:string, format:string) {
        return date.formatDate(fromISO(dt), format);
    }

    export default defineComponent({
        name: 'CommandDateEditor',
        data() {
          return {
              matEvent
          }
        },
        props: {modelValue: String, label: String},
      emits: ['update:modelValue'],
        methods: {
            onChanged(ev: string) {
                this.$emit('update:modelValue', ev);
            },
            onDateChanged(ev: string) {
                const myDate = reformatIsoDate(ev, 'YYYY-MM-DD');
                this.$emit('update:modelValue', myDate);
            },
        },
        computed: {
            dateObj() {
                return reformatIsoDate(this.modelValue || '', 'YYYY/MM/DD');
            }
        }
    })
</script>

<style scoped>

</style>
