<template>
  <div class="markdown-body" v-html="rendered"></div>
</template>

<script lang="ts">
import axios from 'axios';
import { marked } from 'marked';
import { defineComponent } from 'vue';

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
  updated() {
    // Code to run after the markdown-body is rendered
    this.setupClickHandlers();
  },
  methods: {
    loadPage(page: string) {
      const resolvedPage = page.endsWith('.md') ? page : `${page}.md` // Auto append .md

      axios.get('/md/' + resolvedPage)
          .then(response => {
            this.content = response.data;
          })
          .catch(error => this.content = resolvedPage + ':' + error.message);
    },
    setupClickHandlers() {
      // Code to attach click event listeners to anchor tags
      const anchorElements = document.querySelectorAll('.markdown-body a');
      anchorElements.forEach(a => {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          this.$router.push({ path: a.attributes.href.value });
        });
      });
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
