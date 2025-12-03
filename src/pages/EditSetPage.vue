<template>
  <div class="edit-container">
    <h1 class="title">Edit Set {{ setNumber }}</h1>
    <button class="back-btn" @click="$emit('navigate', 'groups')">← Back to Sets</button>
    
    <div v-if="loading" class="loading">Loading words...</div>
    
    <div v-else class="add-word-section">
      <h2 class="section-title">Add New Word</h2>
      <div class="add-word-form">
        <input 
          v-model="newWord.word" 
          placeholder="Dutch word"
          class="add-input"
          @keyup.enter="addWord"
        />
        <select v-model="newWord.article" class="add-select">
          <option value="">Select article</option>
          <option value="de">de</option>
          <option value="het">het</option>
        </select>
        <input 
          v-model="newWord.translation" 
          placeholder="Translation"
          class="add-input"
          @keyup.enter="addWord"
        />
        <button 
          class="add-word-btn" 
          @click="addWord" 
          :disabled="!isValidNewWord || saving"
        >
          + Add Word
        </button>
      </div>
    </div>
    
    <div v-if="words.length === 0 && !loading" class="no-words">
      <p>No words in this set. Add your first word above.</p>
    </div>
    
    <div v-if="words.length > 0" class="words-list">
      <div 
        v-for="(word, index) in words" 
        :key="word.id"
        class="word-item"
        :class="{ 'editing': editingIndex === index }"
      >
        <div v-if="editingIndex !== index" class="word-display">
          <div class="word-content">
            <span class="word-text">{{ word.word }}</span>
            <span class="word-article">{{ word.article }}</span>
            <span class="word-translation">{{ word.translation }}</span>
          </div>
          <div class="word-actions">
            <button class="edit-btn" @click="startEdit(index)" title="Edit word">✏️</button>
            <button class="remove-btn" @click="removeWord(index)" title="Remove word">×</button>
          </div>
        </div>
        
        <div v-else class="word-edit-form">
          <input 
            v-model="editedWord.word" 
            placeholder="Dutch word"
            class="edit-input"
          />
          <select v-model="editedWord.article" class="edit-select">
            <option value="de">de</option>
            <option value="het">het</option>
          </select>
          <input 
            v-model="editedWord.translation" 
            placeholder="Translation"
            class="edit-input"
          />
          <div class="edit-actions">
            <button class="save-btn" @click="saveWord(index)" :disabled="!isValidEdit">Save</button>
            <button class="cancel-btn" @click="cancelEdit">Cancel</button>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="saving" class="saving-indicator">Saving changes...</div>
    <div v-if="saveSuccess" class="success-message">✓ Changes saved successfully!</div>
    <div v-if="saveError" class="error-message">✗ Error: {{ saveError }}</div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { collection, query, where, getDocs, updateDoc, deleteDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default {
  name: 'EditSetPage',
  props: {
    setId: {
      type: String,
      required: true
    },
    setNumber: {
      type: Number,
      required: true
    }
  },
  emits: ['navigate'],
  setup(props) {
    const words = ref([]);
    const loading = ref(true);
    const editingIndex = ref(null);
    const editedWord = ref({ word: '', article: '', translation: '' });
    const newWord = ref({ word: '', article: '', translation: '' });
    const saving = ref(false);
    const saveSuccess = ref(false);
    const saveError = ref('');

    const isValidEdit = computed(() => 
      editedWord.value.word.trim() && 
      editedWord.value.article && 
      editedWord.value.translation.trim()
    );

    const isValidNewWord = computed(() => 
      newWord.value.word.trim() && 
      newWord.value.article && 
      newWord.value.translation.trim()
    );

    const loadWords = async () => {
      try {
        loading.value = true;
        const wordsRef = collection(db, 'words');
        const q = query(
          wordsRef, 
          where('groupId', '==', props.setId)
        );
        const snapshot = await getDocs(q);
        
        const loadedWords = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort by word alphabetically
        words.value = loadedWords.sort((a, b) => {
          if (a.word < b.word) return -1;
          if (a.word > b.word) return 1;
          return 0;
        });
      } catch (error) {
        console.error('Error loading words:', error);
        saveError.value = 'Error loading words: ' + error.message;
      } finally {
        loading.value = false;
      }
    };

    const startEdit = (index) => {
      editingIndex.value = index;
      editedWord.value = {
        word: words.value[index].word,
        article: words.value[index].article,
        translation: words.value[index].translation
      };
    };

    const cancelEdit = () => {
      editingIndex.value = null;
      editedWord.value = { word: '', article: '', translation: '' };
    };

    const saveWord = async (index) => {
      if (!isValidEdit.value) return;

      saving.value = true;
      saveSuccess.value = false;
      saveError.value = '';

      try {
        const wordDocRef = doc(db, 'words', words.value[index].id);
        await updateDoc(wordDocRef, {
          word: editedWord.value.word.trim().toLowerCase(),
          article: editedWord.value.article,
          translation: editedWord.value.translation.trim()
        });

        // Update local state
        words.value[index] = {
          ...words.value[index],
          word: editedWord.value.word.trim().toLowerCase(),
          article: editedWord.value.article,
          translation: editedWord.value.translation.trim()
        };

        // Re-sort after edit
        words.value.sort((a, b) => {
          if (a.word < b.word) return -1;
          if (a.word > b.word) return 1;
          return 0;
        });

        editingIndex.value = null;
        editedWord.value = { word: '', article: '', translation: '' };
        
        saveSuccess.value = true;
        setTimeout(() => {
          saveSuccess.value = false;
        }, 2000);
      } catch (error) {
        console.error('Error saving word:', error);
        saveError.value = 'Error saving word: ' + error.message;
      } finally {
        saving.value = false;
      }
    };

    const removeWord = async (index) => {
      if (!confirm(`Are you sure you want to remove "${words.value[index].word}"?`)) {
        return;
      }

      saving.value = true;
      saveSuccess.value = false;
      saveError.value = '';

      try {
        const wordDocRef = doc(db, 'words', words.value[index].id);
        await deleteDoc(wordDocRef);

        // Remove from local state
        words.value.splice(index, 1);

        // Update set word count
        const setDocRef = doc(db, 'wordGroups', props.setId);
        await updateDoc(setDocRef, {
          wordCount: words.value.length
        });

        saveSuccess.value = true;
        setTimeout(() => {
          saveSuccess.value = false;
        }, 2000);
      } catch (error) {
        console.error('Error removing word:', error);
        saveError.value = 'Error removing word: ' + error.message;
      } finally {
        saving.value = false;
      }
    };

    const addWord = async () => {
      if (!isValidNewWord.value) return;

      saving.value = true;
      saveSuccess.value = false;
      saveError.value = '';

      try {
        const wordsRef = collection(db, 'words');
        const newWordDoc = await addDoc(wordsRef, {
          word: newWord.value.word.trim().toLowerCase(),
          article: newWord.value.article,
          translation: newWord.value.translation.trim(),
          groupId: props.setId
        });

        // Add to local state
        const addedWord = {
          id: newWordDoc.id,
          word: newWord.value.word.trim().toLowerCase(),
          article: newWord.value.article,
          translation: newWord.value.translation.trim()
        };
        
        words.value.push(addedWord);

        // Re-sort after adding
        words.value.sort((a, b) => {
          if (a.word < b.word) return -1;
          if (a.word > b.word) return 1;
          return 0;
        });

        // Update set word count
        const setDocRef = doc(db, 'wordGroups', props.setId);
        await updateDoc(setDocRef, {
          wordCount: words.value.length
        });

        // Clear form
        newWord.value = { word: '', article: '', translation: '' };

        saveSuccess.value = true;
        setTimeout(() => {
          saveSuccess.value = false;
        }, 2000);
      } catch (error) {
        console.error('Error adding word:', error);
        saveError.value = 'Error adding word: ' + error.message;
      } finally {
        saving.value = false;
      }
    };

    onMounted(loadWords);

    return {
      words,
      loading,
      editingIndex,
      editedWord,
      newWord,
      saving,
      saveSuccess,
      saveError,
      isValidEdit,
      isValidNewWord,
      startEdit,
      cancelEdit,
      saveWord,
      removeWord,
      addWord
    };
  }
};
</script>

<style scoped>
.edit-container {
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.title {
  color: #333;
  margin-bottom: 30px;
  font-size: 2rem;
  text-align: center;
}

.back-btn {
  background: #f0f0f0;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 30px;
  font-size: 1rem;
  transition: background 0.2s;
}

.back-btn:hover {
  background: #e0e0e0;
}

.loading, .no-words {
  text-align: center;
  padding: 40px;
  color: #666;
}

.add-word-section {
  margin-bottom: 30px;
  padding: 20px;
  background: #f8f9ff;
  border-radius: 12px;
  border: 2px solid #e0e0e0;
}

.section-title {
  color: #333;
  margin-bottom: 15px;
  font-size: 1.3rem;
  font-weight: 600;
}

.add-word-form {
  display: grid;
  grid-template-columns: 2fr 1fr 2fr auto;
  gap: 12px;
  align-items: center;
}

.add-input, .add-select {
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
}

.add-input:focus, .add-select:focus {
  outline: none;
  border-color: #667eea;
}

.add-word-btn {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.add-word-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.add-word-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.words-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.word-item {
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 15px;
  transition: all 0.2s;
}

.word-item:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
}

.word-item.editing {
  border-color: #667eea;
  background: #f8f9ff;
}

.word-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
}

.word-content {
  display: flex;
  align-items: center;
  gap: 15px;
  flex: 1;
}

.word-text {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  min-width: 150px;
}

.word-article {
  font-size: 1rem;
  color: #667eea;
  font-weight: 600;
  min-width: 50px;
}

.word-translation {
  font-size: 1rem;
  color: #666;
  flex: 1;
}

.word-actions {
  display: flex;
  gap: 8px;
}

.edit-btn, .remove-btn {
  border: none;
  border-radius: 6px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.edit-btn {
  background: #667eea;
  color: white;
}

.edit-btn:hover {
  background: #5568d3;
  transform: scale(1.1);
}

.remove-btn {
  background: #f44336;
  color: white;
  font-size: 1.3rem;
  line-height: 1;
}

.remove-btn:hover {
  background: #d32f2f;
  transform: scale(1.1);
}

.word-edit-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-input, .edit-select {
  padding: 10px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
}

.edit-input:focus, .edit-select:focus {
  outline: none;
  border-color: #667eea;
}

.edit-actions {
  display: flex;
  gap: 10px;
}

.save-btn, .cancel-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.save-btn {
  background: #4caf50;
  color: white;
}

.save-btn:hover:not(:disabled) {
  background: #45a049;
  transform: translateY(-1px);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cancel-btn {
  background: #f0f0f0;
  color: #333;
}

.cancel-btn:hover {
  background: #e0e0e0;
}

.saving-indicator {
  margin-top: 20px;
  text-align: center;
  color: #667eea;
  font-weight: 500;
}

.success-message {
  margin-top: 20px;
  padding: 15px;
  background: #4caf50;
  color: white;
  border-radius: 8px;
  text-align: center;
  font-weight: 600;
}

.error-message {
  margin-top: 20px;
  padding: 15px;
  background: #f44336;
  color: white;
  border-radius: 8px;
  text-align: center;
  font-weight: 600;
}
</style>

