<template>
  <div class="practice-container">
    <div class="progress-text">{{ currentIndex + 1 }} / {{ words.length }}</div>
    
    <div v-if="loading" class="loading">Loading words...</div>
    
    <div v-else-if="words.length === 0" class="no-words">
      <p>No words in this set.</p>
      <button class="back-btn" @click="$emit('navigate', 'groups')">← Back to Sets</button>
    </div>
    
    <div v-else-if="currentWord" class="practice-content">
      <div class="word-display">
        <h2 class="dutch-word">{{ currentWord.word }}</h2>
      </div>
      
      <div class="article-buttons">
        <button 
          class="article-btn" 
          :class="{ 
            'correct': showResult && currentWord.article === 'de' && selectedArticle === 'de',
            'incorrect': showResult && selectedArticle === 'de' && currentWord.article !== 'de',
            'show-correct': showResult && currentWord.article === 'de' && selectedArticle !== 'de'
          }"
          @click="selectArticle('de')"
          :disabled="showResult"
        >
          de
        </button>
        <button 
          class="article-btn"
          :class="{ 
            'correct': showResult && currentWord.article === 'het' && selectedArticle === 'het',
            'incorrect': showResult && selectedArticle === 'het' && currentWord.article !== 'het',
            'show-correct': showResult && currentWord.article === 'het' && selectedArticle !== 'het'
          }"
          @click="selectArticle('het')"
          :disabled="showResult"
        >
          het
        </button>
      </div>
      
      <div v-if="showResult" class="result-feedback">
        <p :class="isCorrect ? 'correct-msg' : 'incorrect-msg'">
          {{ isCorrect ? 'Correct!' : 'Incorrect' }}
        </p>
      </div>
      
      <div v-if="showResult && !practiceComplete" class="next-container">
        <button class="next-btn" @click="nextWord">Next</button>
      </div>
      
      <div v-if="practiceComplete" class="complete-message">
        <h2>Practice Complete!</h2>
        <p>Score: {{ score }} / {{ words.length }}</p>
        <button class="back-btn" @click="$emit('navigate', 'groups')">Back to Sets</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default {
  name: 'PracticePage',
  props: {
    groupId: {
      type: String,
      required: true
    }
  },
  emits: ['navigate'],
  setup(props) {
    const words = ref([]);
    const currentIndex = ref(0);
    const selectedArticle = ref(null);
    const showResult = ref(false);
    const loading = ref(true);
    const score = ref(0);

    const currentWord = computed(() => words.value[currentIndex.value]);
    const isCorrect = computed(() => selectedArticle.value === currentWord.value?.article);
    const practiceComplete = computed(() => 
      showResult.value && currentIndex.value === words.value.length - 1
    );

    const loadWords = async () => {
      try {
        loading.value = true;
        const wordsRef = collection(db, 'words');
        const q = query(
          wordsRef, 
          where('groupId', '==', props.groupId)
        );
        const snapshot = await getDocs(q);
        
        const loadedWords = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort by word alphabetically in JavaScript
        words.value = loadedWords.sort((a, b) => {
          if (a.word < b.word) return -1;
          if (a.word > b.word) return 1;
          return 0;
        });
        
        console.log(`Loaded ${words.value.length} words for set ${props.groupId}`);
      } catch (error) {
        console.error('Error loading words:', error);
        console.error('Error details:', error.message, error.code);
      } finally {
        loading.value = false;
      }
    };

    const selectArticle = (article) => {
      if (showResult.value) return;
      
      selectedArticle.value = article;
      showResult.value = true;
      
      if (isCorrect.value) {
        score.value++;
      }
    };

    const nextWord = () => {
      if (currentIndex.value < words.value.length - 1) {
        currentIndex.value++;
        selectedArticle.value = null;
        showResult.value = false;
      }
    };

    onMounted(loadWords);

    return {
      words,
      currentIndex,
      currentWord,
      selectedArticle,
      showResult,
      loading,
      score,
      isCorrect,
      practiceComplete,
      selectArticle,
      nextWord
    };
  }
};
</script>

<style scoped>
.practice-container {
  background: white;
  border-radius: 20px;
  padding: 60px 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 100%;
  min-height: 500px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.progress-text {
  text-align: center;
  color: #999;
  margin-bottom: 40px;
  font-size: 1rem;
  font-weight: 400;
}

.loading, .no-words {
  text-align: center;
  padding: 40px;
  color: #666;
}

.practice-content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}

.word-display {
  width: 100%;
}

.dutch-word {
  font-size: 3.5rem;
  color: #333;
  font-weight: 400;
  margin: 0;
  letter-spacing: -0.02em;
}

.article-buttons {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 300px;
}

.article-btn {
  width: 100%;
  padding: 20px;
  font-size: 1.5rem;
  font-weight: 400;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
  color: #333;
  text-align: center;
}

.article-btn:hover:not(:disabled) {
  border-color: #999;
  background: #f9f9f9;
}

.article-btn:disabled {
  cursor: not-allowed;
}

.article-btn.correct {
  border-color: #4caf50;
  background: #4caf50;
  color: white;
}

.article-btn.incorrect {
  border-color: #f44336;
  background: #f44336;
  color: white;
}

.article-btn.show-correct {
  border-color: #4caf50;
  background: #e8f5e9;
  color: #4caf50;
}

.result-feedback {
  margin-top: 10px;
  min-height: 30px;
}

.correct-msg {
  color: #4caf50;
  font-size: 1.1rem;
  font-weight: 500;
  margin: 0;
}

.incorrect-msg {
  color: #f44336;
  font-size: 1.1rem;
  font-weight: 500;
  margin: 0;
}

.next-container {
  margin-top: 20px;
}

.next-btn {
  background: #333;
  color: white;
  border: none;
  padding: 12px 40px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.next-btn:hover {
  background: #555;
}

.complete-message {
  text-align: center;
  padding: 40px 0;
}

.complete-message h2 {
  color: #333;
  margin-bottom: 20px;
  font-size: 2rem;
  font-weight: 400;
}

.complete-message p {
  color: #666;
  font-size: 1.2rem;
  margin-bottom: 30px;
  font-weight: 400;
}

.back-btn {
  background: #f0f0f0;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  color: #333;
  transition: background 0.2s;
}

.back-btn:hover {
  background: #e0e0e0;
}
</style>