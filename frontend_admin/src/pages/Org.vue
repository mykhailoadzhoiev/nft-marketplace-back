<template>
  <q-page class="q-pa-md q-gutter-md">
    <div v-if="tokenOriginal">
      <q-card>
        <q-toolbar class="bg-primary glossy">
          <q-toolbar-title> Original </q-toolbar-title>
        </q-toolbar>

        <div v-if="tokenOriginal" class="q-pa-md">
          <div class="q-gutter-md">
            <q-item clickable>
              <q-item-section> Original ID </q-item-section>
              <q-item-section side>
                {{ tokenOriginal.id }}
              </q-item-section>
            </q-item>

            <q-item clickable>
              <q-item-section> Type </q-item-section>
              <q-item-section side>
                {{ tokenOriginal.type }}
              </q-item-section>
            </q-item>

            <q-item v-if="tokenOriginal.type === 'IMPORT'" clickable>
              <q-item-section> Import Addr </q-item-section>
              <q-item-section side>
                {{ tokenOriginal.importAddr }}
              </q-item-section>
            </q-item>

            <q-item v-if="tokenOriginal.type === 'IMPORT'" clickable>
              <q-item-section> Import Token </q-item-section>
              <q-item-section side>
                {{ tokenOriginal.importTokenId }}
              </q-item-section>
            </q-item>

            <q-item clickable>
              <q-item-section> Name </q-item-section>
              <q-item-section side>
                {{ tokenOriginal.name }}
              </q-item-section>
            </q-item>

            <q-item clickable>
              <q-item-section> Description </q-item-section>
              <q-item-section caption>
                {{ tokenOriginal.description }}
              </q-item-section>
            </q-item>

            <q-item clickable>
              <q-item-section> User ID (Original) </q-item-section>
              <q-item-section side>
                <router-link :to="{ path: '/users/' + tokenOriginal.userId }">{{ tokenOriginal.userId }}</router-link>
              </q-item-section>
            </q-item>

            <q-item clickable>
              <q-item-section> Is Censored? </q-item-section>
              <q-item-section side>
                {{ isCensored }}
              </q-item-section>
            </q-item>
          </div>

          <div>
            <h6>Contents:</h6>

            <div class="row justify-evenly">
              <div class="col-md-auto" v-for="content in tokenOriginal.TokenMedias" :key="content.sha256">
                <q-card style="max-width: 400px; margin: 0 auto">
                  <div v-if="content.type === 'IMAGE'">
                    <a :href="'/sha256/' + content.sha256" target="blank">
                      <img :src="'/sha256/' + content.sha256 + ':fullhd'" style="max-width: 400px" />
                    </a>
                  </div>
                  <div v-else-if="content.type === 'VIDEO'">
                    <video style="width: 400px" controls>
                      <source :src="'/sha256/' + content.sha256" type="video/mp4" />
                    </video>
                  </div>
                  <div v-else-if="content.type === 'AUDIO'">
                    <audio controls :src="'/sha256/' + content.sha256" />
                  </div>
                  <q-card-section>
                    {{ getContentType(content) }}
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </div>

          <div class="q-gutter-md q-mt-md">
            <q-btn label="Reprocessing" color="secondary" @click="orgReProcessing(tokenOriginal)" />
            <q-btn label="Delete" color="red" @click="orgDelete(tokenOriginal)" />
          </div>
        </div>
      </q-card>
    </div>
  </q-page>
</template>

<script lang="ts">
import { useMeta } from 'quasar';
import { defineComponent, ref, Ref, onMounted } from 'vue';
import * as Types from '@/models/types';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from '@/store';
import * as AdminModerationModel from '@/models/AdminModerator';
import { Dialog, Notify } from 'quasar';

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

  const isCensored = ref('');

  const tokenOriginal = ref(null) as Ref<
    | null
    | (Types.TokenOriginalView & {
        User: Types.UserView;
        Lots: Types.LotView[]; // only origin lot
        TokensNFT: Types.TokenNFTView;
        TokenMedias: Types.TokenMediaView[];
      })
  >;

  async function updateData() {
    const tokenOriginalId = $route.params['id'] as string;

    const { data } = await AdminModerationModel.getOrgById(tokenOriginalId);
    tokenOriginal.value = data;
    isCensored.value = data.isUseCensored ? 'YES' : 'NO';

    if (store.auth.isAuthAndLoad) {
      const user = store.auth.user as Types.UserView;
    }
  }

  function orgDelete(org: any) {
    const orgView = org as Types.TokenOriginalView;

    Dialog.create({
      title: 'Confirmation',
      color: 'negative',
      message: 'Are you sure you should delete the original?',
      ok: {
        label: 'Yes',
      },
      cancel: {
        label: 'Cancel',
      },
      prompt: {
        model: '',
        label: 'Enter "DELETE" for allow delete original',
        isValid: (val: string) => val === 'DELETE', // << here is the magic
        type: 'text',
      },
    }).onOk(async () => {
      await AdminModerationModel.orgDelete(orgView.id);
      void $router.push({ path: '/orgs' });
    });
  }

  function orgReProcessing(org: any) {
    const orgView = org as Types.TokenOriginalView;

    Dialog.create({
      title: 'Confirmation',
      color: 'secondary',
      message: 'Are you sure you should reprocessing the original?',
      ok: {
        label: 'Yes',
      },
      cancel: {
        label: 'Cancel',
      },
    }).onOk(async () => {
      await AdminModerationModel.orgReProcessing(orgView.id);
      Notify.create({
        message: `Created reprocessing task for org #${orgView.id}`,
        color: 'secondary',
        position: 'top-right',
      });
    });
  }

  onMounted(async () => {
    useMeta({
      title: 'Original page',
    });

    await updateData();
  });

  return {
    tokenOriginal,
    isCensored,
    orgDelete,
    orgReProcessing,
    getContentType: AdminModerationModel.getContentType,
  };
}
</script>
