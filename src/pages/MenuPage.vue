<template>
  <div class="menu-container">
    <h1 class="title">Dutch Articles Trainer</h1>
    <div class="menu-buttons">
      <button class="menu-btn" @click="$emit('navigate', 'groups')">
        Start Practice
      </button>
      <button class="menu-btn" @click="$emit('navigate', 'upload')">
        Upload New Words
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MenuPage',
  emits: ['navigate']
};
</script>

<style scoped>
.menu-container {
  background: white;
  border-radius: 20px;
  padding: 60px 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  text-align: center;
  max-width: 500px;
  width: 100%;
}

.title {
  color: #333;
  margin-bottom: 40px;
  font-size: 2.5rem;
  font-weight: 700;
}

.menu-buttons {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.menu-btn {
  padding: 18px 40px;
  font-size: 1.2rem;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.menu-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
}

.menu-btn:active {
  transform: translateY(0);
}
</style>
