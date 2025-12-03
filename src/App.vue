<template>
  <div class="app">
    <MenuPage v-if="currentPage === 'menu'" @navigate="handleNavigation" />
    <GroupSelectionPage 
      v-else-if="currentPage === 'groups'" 
      @navigate="handleNavigation"
      @select-group="handleGroupSelect"
      @edit-set="handleEditSet"
    />
    <PracticePage 
      v-else-if="currentPage === 'practice'" 
      :groupId="selectedGroupId"
      @navigate="handleNavigation"
    />
    <EditSetPage
      v-else-if="currentPage === 'edit-set'"
      :setId="selectedGroupId"
      :setNumber="selectedSetNumber"
      @navigate="handleNavigation"
    />
    <UploadPage 
      v-else-if="currentPage === 'upload'" 
      @navigate="handleNavigation"
    />
  </div>
</template>

<script>
import { ref } from 'vue';
import MenuPage from './pages/MenuPage.vue';
import GroupSelectionPage from './pages/GroupSelectionPage.vue';
import PracticePage from './pages/PracticePage.vue';
import EditSetPage from './pages/EditSetPage.vue';
import UploadPage from './pages/UploadPage.vue';

export default {
  name: 'App',
  components: {
    MenuPage,
    GroupSelectionPage,
    PracticePage,
    EditSetPage,
    UploadPage
  },
  setup() {
    const currentPage = ref('menu');
    const selectedGroupId = ref(null);
    const selectedSetNumber = ref(null);

    const handleNavigation = (page) => {
      currentPage.value = page;
    };

    const handleGroupSelect = (groupId) => {
      selectedGroupId.value = groupId;
      currentPage.value = 'practice';
    };

    const handleEditSet = (setId, setNumber) => {
      selectedGroupId.value = setId;
      selectedSetNumber.value = setNumber;
      currentPage.value = 'edit-set';
    };

    return {
      currentPage,
      selectedGroupId,
      selectedSetNumber,
      handleNavigation,
      handleGroupSelect,
      handleEditSet
    };
  }
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.app {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
</style>