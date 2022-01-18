<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
import { defineComponent, onMounted } from 'vue';
import { useStore } from '../store';

export default defineComponent({
  name: 'BlankLayout',

  setup () {
    const store = useStore();

    onMounted(async () => {
      await store.auth.init();
    });

    return {};
  }
});
</script>