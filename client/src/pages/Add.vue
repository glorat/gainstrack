<template>
    <div>

        <template v-for="command in commands">
            <el-card class="box-card" :body-style="{ padding: '5px' }" shadow="always">
                <div @click="go(command)" :id="'add-'+command.title.toLowerCase()" style="cursor: pointer;">
                    <el-link><span class="el-icon-circle-plus-outline" ></span> {{command.title}}</el-link>
                    <el-divider></el-divider>
                    {{ command.description }}
                </div>
            </el-card>
            <br>
        </template>
    </div>

</template>

<script>
    import {Card, Link, Divider, DatePicker} from 'element-ui';
    import lang from 'element-ui/lib/locale/lang/en'
    import locale from 'element-ui/lib/locale'
    import {commands} from '@/config/commands';

    locale.use(lang);

    export default {
        name: 'Add',
        methods: {
            go(cmd) {
                this.$router.push({path: '/add/cmd', query: {cmd: cmd.prefix}});
            },
        },
        data() {
            return {
                commands,
            }
        },
        components: {
            'el-card': Card,
            'el-link': Link,
            'el-divider': Divider,
            'el-datepicker': DatePicker,
        }
    }
</script>

<style scoped>
    .clearfix:before,
    .clearfix:after {
        display: table;
        content: "";
    }
    .clearfix:after {
        clear: both
    }

    .body-style {
        padding: 0px;
    }

    .box-card {
        width: 480px;
    }

    .el-divider {
        margin: 0px;
    }
</style>
