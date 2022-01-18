<template>
  <q-page class="row justify-evenly">

  </q-page>
</template>

<script lang="ts">
import { useMeta } from 'quasar';
import { defineComponent, ref, onMounted } from 'vue';

export default defineComponent({
  name: 'PageIndex',
  setup() {
    onMounted(() => {
      useMeta({
        title: 'Index'
      });
    });

    return {};
  }
});
</script>
