<template>
  <div class="upload-container">
    <h1 class="title">Upload New Words</h1>
    <button class="back-btn" @click="$emit('navigate', 'menu')">← Back</button>
    
    <div class="upload-options">
      <button class="option-btn" @click="uploadMode = 'file'">
        📁 Upload CSV File
      </button>
      <button class="option-btn" @click="uploadMode = 'manual'">
        ✏️ Manual Entry
      </button>
    </div>
    
    <!-- File Upload -->
    <div v-if="uploadMode === 'file'" class="upload-section">
      <h2>CSV File Upload</h2>
      <p class="instructions">
        CSV format: word,article,translation<br>
        Example: tafel,de,стол
      </p>
      <input 
        type="file" 
        accept=".csv" 
        @change="handleFileUpload"
        ref="fileInput"
        class="file-input"
      />
      <div v-if="fileWords.length > 0" class="preview">
        <h3>Preview ({{ fileWords.length }} words):</h3>
        <div class="preview-list">
          <div v-for="(word, idx) in fileWords.slice(0, 5)" :key="idx" class="preview-item">
            {{ word.word }} - {{ word.article }} - {{ word.translation }}
          </div>
          <div v-if="fileWords.length > 5">...</div>
        </div>
        <button class="upload-btn" @click="uploadFileWords" :disabled="uploading">
          {{ uploading ? 'Uploading...' : `Upload ${fileWords.length} Words` }}
        </button>
      </div>
    </div>
    
    <!-- Manual Entry -->
    <div v-if="uploadMode === 'manual'" class="upload-section">
      <h2>Manual Entry</h2>
      <div class="manual-form">
        <input 
          v-model="manualWord.word" 
          placeholder="Dutch word"
          class="form-input"
        />
        <select v-model="manualWord.article" class="form-select">
          <option value="">Select article</option>
          <option value="de">de</option>
          <option value="het">het</option>
        </select>
        <input 
          v-model="manualWord.translation" 
          placeholder="Russian translation"
          class="form-input"
        />
        <button class="add-btn" @click="addManualWord" :disabled="!isManualFormValid">
          Add Word
        </button>
      </div>
      
      <div v-if="manualWords.length > 0" class="manual-list">
        <h3>Words to upload ({{ manualWords.length }}):</h3>
        <div class="word-list">
          <div v-for="(word, idx) in manualWords" :key="idx" class="word-item">
            <span>{{ word.word }} - {{ word.article }} - {{ word.translation }}</span>
            <button @click="removeManualWord(idx)" class="remove-btn">×</button>
          </div>
        </div>
        <button class="upload-btn" @click="uploadManualWords" :disabled="uploading">
          {{ uploading ? 'Uploading...' : `Upload ${manualWords.length} Words` }}
        </button>
      </div>
    </div>
    
    <div v-if="uploadSuccess" class="success-message">
      ✓ Words uploaded successfully!
    </div>
    <div v-if="uploadError" class="error-message">
      ✗ Error: {{ uploadError }}
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { collection, addDoc, getDocs, query, orderBy, limit, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import Papa from 'papaparse';

export default {
  name: 'UploadPage',
  emits: ['navigate'],
  setup() {
    const uploadMode = ref(null);
    const fileWords = ref([]);
    const manualWords = ref([]);
    const manualWord = ref({ word: '', article: '', translation: '' });
    const uploading = ref(false);
    const uploadSuccess = ref(false);
    const uploadError = ref('');

    const isManualFormValid = computed(() => 
      manualWord.value.word.trim() && 
      manualWord.value.article && 
      manualWord.value.translation.trim()
    );

    const handleFileUpload = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          fileWords.value = results.data
            .map(row => ({
              word: row[0]?.trim().toLowerCase() || '',
              article: row[1]?.trim().toLowerCase() || '',
              translation: row[2]?.trim() || ''
            }))
            .filter(w => w.word && w.article && w.translation)
            .filter(w => w.article === 'de' || w.article === 'het');
        },
        error: (error) => {
          uploadError.value = 'Error parsing CSV: ' + error.message;
        }
      });
    };

    const addManualWord = () => {
      if (!isManualFormValid.value) return;
      
      manualWords.value.push({
        word: manualWord.value.word.trim().toLowerCase(),
        article: manualWord.value.article,
        translation: manualWord.value.translation.trim()
      });
      
      manualWord.value = { word: '', article: '', translation: '' };
    };

    const removeManualWord = (index) => {
      manualWords.value.splice(index, 1);
    };

    const getNextGroupNumber = async () => {
      try {
        console.log('Getting next set number...');
        const groupsRef = collection(db, 'wordGroups');
        const q = query(groupsRef, orderBy('number', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          console.log('No sets found, starting with set 1');
          return 1;
        }
        const nextNumber = snapshot.docs[0].data().number + 1;
        console.log('Next set number:', nextNumber);
        return nextNumber;
      } catch (error) {
        console.error('Error getting next set number:', error);
        throw error;
      }
    };

    const uploadWords = async (wordsToUpload) => {
      uploading.value = true;
      uploadSuccess.value = false;
      uploadError.value = '';

      try {
        console.log('Starting upload of', wordsToUpload.length, 'words');
        
        // Get starting set number
        console.log('Step 1: Getting set number...');
        const groupNumber = await getNextGroupNumber();
        console.log('Step 1 complete. Set number:', groupNumber);
        
        const wordsInGroup = [];
        let currentGroupId = null;
        let currentGroupNumber = groupNumber;

        for (let i = 0; i < wordsToUpload.length; i++) {
          const word = wordsToUpload[i];
          console.log(`Processing word ${i + 1}/${wordsToUpload.length}:`, word.word);
          
          // Create new set if needed (every 25 words or at start)
          if (wordsInGroup.length === 0) {
            console.log('Creating new set...');
            const groupsRef = collection(db, 'wordGroups');
            const newGroup = await addDoc(groupsRef, {
              number: currentGroupNumber,
              wordCount: 0,
              createdAt: new Date()
            });
            currentGroupId = newGroup.id;
            console.log('Set created with ID:', currentGroupId);
          }

          // Add word to Firestore
          console.log('Adding word to Firestore...');
          const wordsRef = collection(db, 'words');
          await addDoc(wordsRef, {
            word: word.word,
            article: word.article,
            translation: word.translation,
            groupId: currentGroupId
          });
          console.log('Word added successfully:', word.word);

          wordsInGroup.push(word);

          // If set is full (25 words), update set and prepare for next
          if (wordsInGroup.length >= 25) {
            console.log('Set full, updating word count...');
            const groupDocRef = doc(db, 'wordGroups', currentGroupId);
            await updateDoc(groupDocRef, {
              wordCount: wordsInGroup.length
            });
            console.log('Set updated');
            
            // Reset for next set
            wordsInGroup.length = 0;
            currentGroupId = null;
            currentGroupNumber++;
          }
        }

        // Update last set's word count if it has words
        if (wordsInGroup.length > 0 && currentGroupId) {
          console.log('Updating final set word count...');
          const groupDocRef = doc(db, 'wordGroups', currentGroupId);
          await updateDoc(groupDocRef, {
            wordCount: wordsInGroup.length
          });
          console.log('Final set updated');
        }

        console.log('Upload complete!');
        uploadSuccess.value = true;
        fileWords.value = [];
        manualWords.value = [];
        
        setTimeout(() => {
          uploadSuccess.value = false;
        }, 3000);
      } catch (error) {
        console.error('Upload error details:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        uploadError.value = `Error: ${error.message || error.code || 'Unknown error'}`;
      } finally {
        uploading.value = false;
        console.log('Upload process finished');
      }
    };

    const uploadFileWords = () => {
      uploadWords(fileWords.value);
    };

    const uploadManualWords = () => {
      uploadWords(manualWords.value);
    };

    return {
      uploadMode,
      fileWords,
      manualWords,
      manualWord,
      uploading,
      uploadSuccess,
      uploadError,
      isManualFormValid,
      handleFileUpload,
      addManualWord,
      removeManualWord,
      uploadFileWords,
      uploadManualWords
    };
  }
};
</script>

<style scoped>
.upload-container {
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 700px;
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
}

.back-btn:hover {
  background: #e0e0e0;
}

.upload-options {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
}

.option-btn {
  flex: 1;
  padding: 20px;
  font-size: 1.1rem;
  border: 2px solid #667eea;
  border-radius: 12px;
  background: white;
  color: #667eea;
  cursor: pointer;
  transition: all 0.2s;
}

.option-btn:hover {
  background: #667eea;
  color: white;
}

.upload-section {
  margin-top: 30px;
}

.upload-section h2 {
  color: #333;
  margin-bottom: 15px;
}

.instructions {
  color: #666;
  margin-bottom: 20px;
  font-size: 0.9rem;
}

.file-input {
  width: 100%;
  padding: 12px;
  border: 2px dashed #ddd;
  border-radius: 8px;
  margin-bottom: 20px;
  cursor: pointer;
}

.preview {
  margin-top: 20px;
}

.preview h3 {
  color: #333;
  margin-bottom: 10px;
}

.preview-list {
  background: #f9f9f9;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  max-height: 200px;
  overflow-y: auto;
}

.preview-item {
  padding: 8px 0;
  border-bottom: 1px solid #eee;
  color: #666;
}

.manual-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 30px;
}

.form-input, .form-select {
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
}

.form-input:focus, .form-select:focus {
  outline: none;
  border-color: #667eea;
}

.add-btn {
  padding: 12px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.add-btn:hover:not(:disabled) {
  background: #5568d3;
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.manual-list {
  margin-top: 30px;
}

.manual-list h3 {
  color: #333;
  margin-bottom: 15px;
}

.word-list {
  background: #f9f9f9;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  max-height: 300px;
  overflow-y: auto;
}

.word-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
  color: #666;
}

.remove-btn {
  background: #f44336;
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
}

.remove-btn:hover {
  background: #d32f2f;
}

.upload-btn {
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.upload-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
}

.upload-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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