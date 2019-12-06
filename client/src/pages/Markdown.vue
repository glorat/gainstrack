<template>
    <div v-html="rendered">
    </div>
</template>

<script>
    import axios from 'axios';
    import marked from 'marked';

    export default {
        name: 'Markdown',
        props: ['page'],
        data() {
            return {
                content: 'Loading...'
            }
        },
        computed: {
            rendered() {
                return marked(this.content)
            }
        },
        mounted() {
            const page = this.page;
            this.loadPage(page);
        },
        methods: {
          loadPage(page) {
              axios.get('/' + page)
                  .then(response => {
                      this.content = response.data;
                  })
                  .catch(error => this.content = page + ':' + error.message);
          }
        },
        watch: {
            page: {
                handler(val) {
                    this.loadPage(val)
                }
            }
        }
    }
</script>

<style scoped>

</style>
