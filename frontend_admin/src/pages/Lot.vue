<template>
  <q-page class="q-pa-md q-gutter-md">
    <div v-if="lot">
      <q-card>
        <q-toolbar class="bg-primary glossy">
          <q-toolbar-title> Lot </q-toolbar-title>
        </q-toolbar>

        <div v-if="lot.TokenOriginal" class="q-pa-md">
          <div class="q-gutter-md">
            <q-item clickable>
              <q-item-section> Lot ID </q-item-section>
              <q-item-section side>
                {{ lot.id }}
              </q-item-section>
            </q-item>

            <q-item clickable>
              <q-item-section> Original ID </q-item-section>
              <q-item-section side>
                <router-link :to="{ path: '/orgs/' + lot.TokenOriginal.id }">{{ lot.TokenOriginal.id }}</router-link>
              </q-item-section>
            </q-item>

            <q-item clickable>
              <q-item-section> Lot status </q-item-section>
              <q-item-section side>
                {{ lot.status }}
              </q-item-section>
            </q-item>

            <q-item clickable>
              <q-item-section> Type sales of lot </q-item-section>
              <q-item-section side>
                {{ lot.saleType }}
              </q-item-section>
            </q-item>

            <q-item clickable>
              <q-item-section> Name </q-item-section>
              <q-item-section side>
                {{ lot.TokenOriginal.name }}
              </q-item-section>
            </q-item>

            <q-item clickable>
              <q-item-section> Description </q-item-section>
              <q-item-section caption>
                {{ lot.TokenOriginal.description }}
              </q-item-section>
            </q-item>

            <q-item clickable>
              <q-item-section> User ID (Lot) </q-item-section>
              <q-item-section side>
                <router-link :to="{ path: '/users/' + lot.userId }">{{ lot.userId }}</router-link>
              </q-item-section>
            </q-item>

            <q-item clickable>
              <q-item-section> User ID (Original) </q-item-section>
              <q-item-section side>
                <router-link :to="{ path: '/users/' + lot.TokenOriginal.userId }">{{
                  lot.TokenOriginal.userId
                }}</router-link>
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
              <div class="col-md-auto" v-for="content in lot.TokenOriginal.TokenMedias" :key="content.sha256">
                <q-card style="max-width: 400px; margin: 0 auto">
                  <div v-if="content.type === 'IMAGE'">
                    <a :href="'/sha256/' + content.sha256" target="blank">
                      <img :src="'/sha256/' + content.sha256 + ':fullhd'" style="max-width: 400px" />
                    </a>
                  </div>
                  <div v-else>
                    <video style="width: 400px" controls>
                      <source :src="'/sha256/' + content.sha256" type="video/mp4" />
                    </video>
                  </div>
                  <q-card-section>
                    {{ getContentType(content) }}
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </div>

          <div class="q-gutter-md q-mt-md">
            <q-btn
              v-if="lot.status === 'IN_SALES'"
              label="Close of lot"
              title="Close of lot"
              color="secondary"
              @click="lotClose()"
            />
          </div>
        </div>
      </q-card>
    </div>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref, Ref, onMounted, reactive } from 'vue';
import * as Types from '@/models/types';
import { useRoute, useRouter } from 'vue-router';
import { useToDateFormat } from '@/hooks/common';
import { useStore } from '@/store';
import * as AdminModerationModel from '@/models/AdminModerator';
import { useMeta, date, Dialog, Notify } from 'quasar';

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

  const mainContent = ref(null) as Ref<Types.TokenMediaView | null>;
  const isCensored = ref('');

  const lot = ref(null) as Ref<
    | null
    | (Types.LotView & {
        User: Types.UserView;
        TokenOriginal: Types.TokenOriginalView & {
          TokenMedias: Types.TokenMediaView;
        };
        LotTokens: Types.LotTokenView & {
          TokenNFT: Types.TokenNFTView;
        };
      })
  >;

  function lotClose() {
    const lotView = lot.value as Types.LotView;

    Dialog.create({
      title: 'Confirmation',
      color: 'secondary',
      message: 'Are you sure you should close this lot?',
      ok: {
        label: 'Yes',
      },
      cancel: {
        label: 'Cancel',
      },
    }).onOk(async () => {
      await AdminModerationModel.postCloseLotAction(lotView.id);
      await updateData();
    });
  }

  async function updateData() {
    const lotId = $route.params['id'] as string;

    const { data } = await AdminModerationModel.getLotById(lotId);
    mainContent.value = data.TokenOriginal.TokenMedias.filter((v) => v.isOriginal)[0] || null;
    lot.value = data;
    isCensored.value = data.TokenOriginal.isUseCensored ? 'YES' : 'NO';

    if (store.auth.isAuthAndLoad) {
      const user = store.auth.user as Types.UserView;
    }
  }

  onMounted(async () => {
    useMeta({
      title: 'Lot page',
    });

    await updateData();
  });

  return {
    lot,
    mainContent,
    isCensored,
    lotClose,
    getContentType: AdminModerationModel.getContentType,
  };
}
</script>
