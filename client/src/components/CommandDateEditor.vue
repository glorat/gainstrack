<template>
    <el-date-picker
            :value="value"
            v-on:input="onChanged($event)"
            type="date"
            value-format="yyyy-MM-dd"
            size="mini"
            :clearable="false"
    >
    </el-date-picker>
</template>

<script lang="ts">
    import {DatePicker} from 'element-ui';
    import lang from 'element-ui/lib/locale/lang/en'
    import locale from 'element-ui/lib/locale'
    import Vue from 'vue';
    locale.use(lang);


    export default Vue.extend({
        name: 'CommandDateEditor',
        components: { 'el-date-picker': DatePicker},
        props: {value: String},
        methods: {
            onChanged(ev: string) {
                this.$emit('input', ev);
            },
        }
    })
</script>

<style scoped>

</style>