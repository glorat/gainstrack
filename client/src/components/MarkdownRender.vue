<template>
    <div class="markdown-body" v-html="rendered"></div>
</template>

<script lang="ts">
    import axios from 'axios';
    import {marked} from 'marked';
    import {defineComponent} from 'vue';

    interface MyData {
        content: string
    }

    export default defineComponent({
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
              const resolvedPage = page.endsWith('.md') ? page : `${page}.md` // Auto append .md

                axios.get('/md/' + resolvedPage)
                    .then(response => {
                        this.content = response.data;
                    })
                    .catch(error => this.content = resolvedPage + ':' + error.message);
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
