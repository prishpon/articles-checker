<template>
  <div class="groups-container">
    <h1 class="title">Select Word Set</h1>
    <button class="back-btn" @click="$emit('navigate', 'menu')">← Back</button>
    
    <div v-if="loading" class="loading">Loading sets...</div>
    
    <div v-else-if="groups.length === 0" class="no-groups">
      <p>No word sets available. Please upload words first.</p>
    </div>
    
    <div v-else class="groups-grid">
      <div 
        v-for="group in groups" 
        :key="group.id"
        class="group-card-wrapper"
      >
        <button 
          class="group-card"
          @click="$emit('select-group', group.id)"
        >
          <div class="group-number">Set {{ group.number }}</div>
          <div class="group-info">{{ group.wordCount }} words</div>
        </button>
        <button 
          class="edit-btn"
          @click.stop="$emit('edit-set', group.id, group.number)"
          title="Edit set"
        >
          ✏️
        </button>
        <button 
          class="delete-btn"
          @click.stop="deleteSet(group.id)"
          :disabled="deleting"
          title="Delete set"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { collection, getDocs, query, orderBy, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export default {
  name: 'GroupSelectionPage',
  emits: ['navigate', 'select-group', 'edit-set'],
  setup() {
    const groups = ref([]);
    const loading = ref(true);
    const deleting = ref(false);

    const loadGroups = async () => {
      try {
        const groupsRef = collection(db, 'wordGroups');
        const q = query(groupsRef, orderBy('number', 'asc'));
        const snapshot = await getDocs(q);
        
        groups.value = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error('Error loading sets:', error);
      } finally {
        loading.value = false;
      }
    };

    const deleteSet = async (setId) => {
      if (!confirm('Are you sure you want to delete this set and all its words? This action cannot be undone.')) {
        return;
      }

      deleting.value = true;
      try {
        // First, delete all words in this set
        const wordsRef = collection(db, 'words');
        const wordsQuery = query(wordsRef, where('groupId', '==', setId));
        const wordsSnapshot = await getDocs(wordsQuery);
        
        const deletePromises = wordsSnapshot.docs.map(wordDoc => deleteDoc(wordDoc.ref));
        await Promise.all(deletePromises);
        
        // Then delete the set itself
        const setDocRef = doc(db, 'wordGroups', setId);
        await deleteDoc(setDocRef);
        
        // Reload the sets list
        await loadGroups();
      } catch (error) {
        console.error('Error deleting set:', error);
        alert('Error deleting set: ' + error.message);
      } finally {
        deleting.value = false;
      }
    };

    onMounted(loadGroups);

    return { groups, loading, deleting, deleteSet };
  }
};
</script>

<style scoped>
.groups-container {
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
  margin-bottom: 20px;
  font-size: 1rem;
}

.back-btn:hover {
  background: #e0e0e0;
}

.loading, .no-groups {
  text-align: center;
  padding: 40px;
  color: #666;
}

.groups-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 20px;
}

.group-card-wrapper {
  position: relative;
}

.group-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 30px 20px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  text-align: center;
  width: 100%;
}

.group-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
}

.edit-btn {
  position: absolute;
  top: 8px;
  right: 40px;
  background: rgba(102, 126, 234, 0.9);
  color: white;
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, transform 0.2s;
  z-index: 10;
}

.edit-btn:hover {
  background: #667eea;
  transform: scale(1.1);
}

.delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(244, 67, 54, 0.9);
  color: white;
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  cursor: pointer;
  font-size: 1.3rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, transform 0.2s;
  z-index: 10;
}

.delete-btn:hover:not(:disabled) {
  background: #f44336;
  transform: scale(1.1);
}

.delete-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.group-number {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.group-info {
  font-size: 0.9rem;
  opacity: 0.9;
}
</style>