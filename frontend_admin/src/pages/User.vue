<template>
  <q-page class="q-pa-md q-gutter-md">
    <div v-if="user">
      <q-card style="max-width: 522px">
        <q-toolbar class="bg-primary glossy">
          <q-toolbar-title> User ID: {{ user.id }} </q-toolbar-title>
        </q-toolbar>

        <div class="q-pa-md">
          <q-list bordered>
            <q-item clickable>
              <q-item-section> Avatar </q-item-section>
              <q-item-section side avatar>
                <q-avatar>
                  <img :src="user.avatar ? '/sha256/' + user.avatar : 'https://cdn.quasar.dev/img/boy-avatar.png'" />
                </q-avatar>
              </q-item-section>
            </q-item>

            <q-item clickable>
              <q-item-section> User ID </q-item-section>
              <q-item-section side>
                {{ user.id }}
              </q-item-section>
            </q-item>

            <q-item clickable>
              <q-item-section> Role </q-item-section>
              <q-item-section side> {{ user.role }} {{ user.role === 'GUEST' ? '(BAN)' : '' }} </q-item-section>
            </q-item>

            <q-item clickable>
              <q-item-section> Email </q-item-section>
              <q-item-section side>
                {{ user.email }}
              </q-item-section>
            </q-item>

            <q-item clickable>
              <q-item-section> Name </q-item-section>
              <q-item-section side>
                {{ user.name }}
              </q-item-section>
            </q-item>

            <q-item clickable>
              <q-item-section> @ </q-item-section>
              <q-item-section side>
                {{ user.metaName }}
              </q-item-section>
            </q-item>

            <q-item clickable>
              <q-item-section> Addr </q-item-section>
              <q-item-section side>
                <a :href="'https://bscscan.com/address/' + user.metamaskAddress" target="blank">{{
                  user.metamaskAddress
                }}</a>
              </q-item-section>
            </q-item>

            <q-item clickable>
              <q-item-section> Created At </q-item-section>
              <q-item-section side>
                {{ toDateFormat(user.createdAt) }}
              </q-item-section>
            </q-item>
          </q-list>

          <div class="q-gutter-md q-mt-md">
            <q-btn v-if="user.role === 'USER'" label="Ban" color="red" @click="userBan" />
            <q-btn v-if="user.role === 'GUEST'" label="Un Ban" @click="userUnBan" />
          </div>
        </div>
      </q-card>
    </div>
  </q-page>
</template>

<script lang="ts">
import { useMeta } from 'quasar';
import { defineComponent, ref, Ref, onMounted, reactive } from 'vue';
import * as Types from '@/models/types';
import { useRoute, useRouter } from 'vue-router';
import { useToDateFormat } from '@/hooks/common';
import { useStore } from '@/store';
import * as AdminModerationModel from '@/models/AdminModerator';
import { date, Dialog, Notify } from 'quasar';

export default defineComponent({
  name: 'PageLot',

  props: {},

  setup() {
    const base = useBase();
    return {
      ...base,
    };
  },
});

function useBase() {
  const $route = useRoute();
  const $router = useRouter();
  const store = useStore();

  const user = ref(null) as Ref<null | Types.UserView>;

  async function updateData() {
    const userId = $route.params['id'] as string;

    const { data } = await AdminModerationModel.getUserById(userId);
    user.value = data;

    if (store.auth.isAuthAndLoad) {
      const user = store.auth.user as Types.UserView;
    }
  }

  function userBan() {
    if (!user.value) {
      return;
    }

    const u = user.value as Types.UserView;

    Dialog.create({
      title: 'Confirmation',
      message: 'Ban a user?',
      ok: {
        label: 'Yes',
      },
      cancel: {
        label: 'Cancel',
      },
    }).onOk(async () => {
      await AdminModerationModel.postBanUser(u.id);
      await updateData();
    });
  }

  function userUnBan() {
    if (!user.value) {
      return;
    }

    const u = user.value as Types.UserView;

    Dialog.create({
      title: 'Confirmation',
      message: 'UnBan a user?',
      ok: {
        label: 'Yes',
      },
      cancel: {
        label: 'Cancel',
      },
    }).onOk(async () => {
      await AdminModerationModel.postUnBanUser(u.id);
      await updateData();
    });
  }

  onMounted(async () => {
    useMeta({
      title: 'User page',
    });

    await updateData();
  });

  return {
    user,

    userBan,
    userUnBan,

    toDateFormat: useToDateFormat().toDateFormat,
  };
}
</script>
