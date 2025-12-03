
<template>
  <div>
    <input v-model="word" placeholder="Enter word" />
    <button @click="checkArticle">Check</button>

    <p v-if="result">Article: {{ result }}</p>
    <p v-if="result === null">Not found</p>
  </div>
</template>

<script>
import { findArticle } from "../services/findArticle";

export default {
  data() {
    return { word: "", result: undefined };
  },
  methods: {
    async checkArticle() {
      this.result = await findArticle(this.word.trim());
    }
  }
};
</script>
