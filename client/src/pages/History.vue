<template>
    <my-page padding>
        <template v-for="commit in commits">
            <template v-if="commit.event && commit.event.adds">
                Added: <pre><template v-for="cmd in commit.event.adds"><template
                        v-for="line in cmd">{{ line }}
</template></template></pre></template>
            <template v-if="commit.event && commit.event.removes">
                Removed: <pre><template v-for="cmd in commit.event.removes"><template
                    v-for="line in cmd">{{ line }}
</template></template></pre>
            </template>

        </template>
    </my-page>
</template>

<script>
    import axios from 'axios';

    export default {
        name: 'History',
        data() {
          return {
              commits: [],
          }
        },
        mounted() {
            axios.post('/api/history')
                .then(response => this.commits = response.data)
                .catch(error => this.$notify.error(error))
        },
    }
</script>

<style scoped>

</style>
