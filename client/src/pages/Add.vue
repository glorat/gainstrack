<template>
  <my-page padding>
    <div class="q-pa-md row items-start q-gutter-md">
      <!-- eslint-disable -->
      <!--        FIXME: command needs a unique id-->
      <template v-for="command in commands">
        <q-card class="box-card">
          <q-card-section @click="go(command)" :id="'add-'+command.title.toLowerCase()" style="cursor: pointer;">
            <span class="fake-link"><q-icon :name="matAddCircleOutline"/> {{command.title}}</span>
          </q-card-section>
          <q-separator inset/>
          <q-card-section>
            {{ command.description }}
          </q-card-section>
        </q-card>
        <br>
      </template>
      <!-- eslint-enable -->
    </div>
  </my-page>

</template>

<script>
  import { commands } from '../config/commands'
  import { matAddCircleOutline } from '@quasar/extras/material-icons'

  export default {
    name: 'Add',
    methods: {
      go (cmd) {
        this.$router.push({
          path: '/add/cmd',
          query: { cmd: cmd.prefix }
        })
      },
    },
    data () {
      return {
        commands,
        matAddCircleOutline
      }
    },
    components: {}
  }
</script>

<style scoped>
  .fake-link {
    cursor: pointer;
  }

  .fake-link:hover {
    color: #409EFF
  }

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
