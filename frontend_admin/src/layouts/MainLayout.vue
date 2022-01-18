<template>
  <q-layout view="hHh lpr fFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title>
          NFT Market ADMIN
        </q-toolbar-title>

        <div>
          <q-btn flat dense icon="logout" title="Logout" :to="{ path: '/logout' }" />
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      class="bg-grey-1"
    >
      <q-list>
        <q-item 
          :to="{ path: '/profile' }"
          v-if="userIsAuthAndLoad && user" 
          style="padding: 0"
        >
          <q-img src="https://cdn.quasar.dev/img/material.png" style="height: 150px;">
            <div class="absolute-bottom bg-transparent">
              <q-avatar size="56px" class="q-mb-sm">
                <img :src="user.avatar ? '/sha256/' + user.avatar : 'https://cdn.quasar.dev/img/boy-avatar.png'">
              </q-avatar>
              <div class="text-weight-bold">{{ user.name }}</div>
            </div>
          </q-img>
        </q-item>

        <q-item 
          clickable 
          v-ripple
          :to="{ path: '/' }"
        >
          <q-item-section avatar>
            <q-icon name="inbox" />
          </q-item-section>

          <q-item-section>
            Index
          </q-item-section>
        </q-item>

        <q-item 
          clickable 
          v-ripple
          :to="{ path: '/orgs_for_moderation' }"
        >
          <q-item-section avatar>
            <q-icon name="visibility" />
          </q-item-section>

          <q-item-section>
            Originals for moderation
          </q-item-section>
        </q-item>

         <q-item 
          clickable 
          v-ripple
          :to="{ path: '/orgs' }"
         >
          <q-item-section avatar>
            <q-icon name="crop_original" />
          </q-item-section>

          <q-item-section>
            Originals All
          </q-item-section>
        </q-item>

        <q-item 
          clickable 
          v-ripple
          :to="{ path: '/lots' }"
         >
          <q-item-section avatar>
            <q-icon name="local_laundry_service" />
          </q-item-section>

          <q-item-section>
            Lots
          </q-item-section>
        </q-item>

        <q-item 
          clickable 
          v-ripple
          :to="{ path: '/users' }"
         >
          <q-item-section avatar>
            <q-icon name="people" />
          </q-item-section>

          <q-item-section>
            Users
          </q-item-section>
        </q-item>

        <q-item 
          clickable 
          v-ripple
          :to="{ path: '/users_featured' }"
         >
          <q-item-section avatar>
            <q-icon name="people" />
          </q-item-section>

          <q-item-section>
            Users Featured
          </q-item-section>
        </q-item>

        <q-item 
          clickable 
          v-ripple
          :to="{ path: '/fail_tasks' }"
         >
          <q-item-section avatar>
            <q-icon name="sms_failed" />
          </q-item-section>

          <q-item-section>
            Fail Tasks
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useStore } from '../store';

export default defineComponent({
  name: 'MainLayout',

  setup () {
    const leftDrawerOpen = ref(false);
    const store = useStore();

    const userIsAuthAndLoad = computed(() => {
      return store.auth.isAuthAndLoad;
    });
    const user = computed(() => {
      return store.auth.user;
    });

    onMounted(async () => {
      await store.auth.init();
    });

    return {
      leftDrawerOpen,
      toggleLeftDrawer () {
        leftDrawerOpen.value = !leftDrawerOpen.value
      },

      userIsAuthAndLoad,
      user
    }
  }
})
</script>
