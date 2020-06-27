<template>
    <div v-html="rendered"></div>
</template>

<script lang="ts">
    import axios from 'axios';
    import marked from 'marked';
    import Vue from 'vue';

    interface MyData {
        content: string
    }

    export default Vue.extend({
        name: 'MarkdownRender',
        props: ['page'],
        data(): MyData {
            return {
                content: 'Loading...'
            };
        },
        computed: {
            rendered(): string {
                return marked(this.content);
            }
        },
        mounted() {
            const page = this.page;
            this.loadPage(page);
        },
        methods: {
            loadPage(page: string) {
                axios.get('/md/' + page)
                    .then(response => {
                        this.content = response.data;
                    })
                    .catch(error => this.content = page + ':' + error.message);
            }
        },
        watch: {
            page: {
                handler(val: string) {
                    this.loadPage(val);
                }
            }
        }
    });
</script>

<style scoped>

</style>
