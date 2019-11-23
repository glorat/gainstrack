<template>
    <form id="filter-form" class="filter-form">
        <span class="empty"> <!-- class empty? -->
            <input id="time-filter" class="time-filter" :placeholder="latestDate" size="10" type="text"></input>
            <el-date-picker  type="date" value-format="yyyy-MM-dd" size="small" clearable
                             :placeholder="latestDate" @input="onDateChange" :value="dateOverride"></el-date-picker>
        </span>
    </form>
</template>

<script>
    import {DatePicker} from 'element-ui';
    import lang from 'element-ui/lib/locale/lang/en'
    import locale from 'element-ui/lib/locale'
    locale.use(lang);

    export default {
        name: 'FilterForm',
        components: {'el-date-picker': DatePicker},
        computed: {
            latestDate() {
                return this.$store.state.summary.latestDate;

            },
            dateOverride() {
                return this.$store.state.summary.dateOverride;
            }
        },
        methods: {
            onDateChange(e) {
                this.$store.dispatch('dateOverride', e);
                console.log(e);
            },
        }
    }
</script>

<style scoped>
    .el-date-editor.el-input,
    .el-date-editor.el-input__inner {
        width: 150px;
    }

    .filter-form {
        flex-wrap: wrap;
    }

    .filter-form {
        display: none;
    }


    .filter-form {
        display: flex;
        padding-top: 7px;
        margin: 0;
        color: var(--color-text);
    }

    .filter-form > span {
        position: relative;
        margin: 0 4px 6px 0;
    }

    .el-date-editor.el-input__inner,
    .filter-form .el-input__inner,
    .filter-form input {
        max-width: 18rem;
        padding: 8px 25px 8px 10px;
        margin: 0;
        background-color: var(--color-background);
        border: 0;
        outline: none;
    }

    .el-date-editor.el-input__inner:focus,
    .filter-form .el-input__inner:focus,
    .filter-form [type="text"]:focus {
        color: var(--color-text);
        background-color: var(--color-background);
    }

    .el-date-editor.el-input__inner,
    .filter-form [type="text"]:placeholder-shown,
    .filter-form [type="text"]::placeholder {
        color: var(--color-header-tinted);
        opacity: 1;
    }

    .filter-form [type="text"]:focus:placeholder-shown,
    .filter-form [type="text"]:focus::placeholder {
        color: var(--color-header-tinted);
    }

    .filter-form [type="submit"] {
        display: none;
    }

    .filter-form .empty input {
        background-color: var(--color-header-light);
    }

    .filter-form .close {
        position: absolute;
        top: 8px;
        right: 0;
        display: block;
    }

    .filter-form .empty .close {
        display: none;
    }
</style>
