<template>
  <q-page class="q-pa-md" style="margin: 0 auto; max-width: 400px">
  </q-page>
</template>

<script lang="ts">
import { defineComponent, onMounted } from 'vue';
import { useStore } from '@/store';
import { useRouter } from 'vue-router';

export default defineComponent({
  setup (props, ctx) {
    const store = useStore();
    const router = useRouter();

    onMounted(async () => {
      store.auth.logout();
      await router.replace({ path: '/auth/login' });
    });
    return {}
  }
})
</script>