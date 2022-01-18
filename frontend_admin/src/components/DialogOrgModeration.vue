<template>
  <q-dialog v-model="dialogFlag" @hide="closeDialog" persistent>
    <q-card style="width: 1440px; max-width: 100%">
      <q-toolbar class="bg-primary glossy">
        <q-toolbar-title> Dialog original moderation </q-toolbar-title>
        <q-btn flat round dense icon="close" v-close-popup />
      </q-toolbar>

      <div v-if="org" class="q-pa-md">
        <div class="q-gutter-md">
          <q-input label="ID" v-model="org.id" readonly />

          <q-input label="Type" v-model="org.type" readonly />

          <q-input label="Import Addr" v-if="org.type === 'IMPORT'" v-model="org.importAddr" readonly />

          <q-input label="Import Token" v-if="org.type === 'IMPORT'" v-model="org.importTokenId" readonly />

          <q-input label="Name" v-model="org.name" readonly />

          <q-input label="Description" v-model="org.description" readonly />

          <q-input label="User ID" v-model="org.userId" readonly />

          <q-input label="Copies NFT" v-model="org.copiesTotal" readonly />

          <q-input label="Is Censored?" v-model="isCensored" readonly />
        </div>

        <div>
          <h6>Contents:</h6>

          <div class="row justify-evenly">
            <div class="col-md-auto" v-for="content in org.TokenMedias" :key="content.sha256">
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
          <q-btn label="Delete" color="negative" @click="orgDelete" />
          <q-btn label="Ban" color="warning" @click="orgToDraft" />
          <q-btn label="Confirm" color="primary" @click="orgConfirm" />
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import {
  defineComponent,
  ref,
  Ref,
  PropType,
  SetupContext,
  onMounted,
  onUnmounted,
  watch,
  WatchStopHandle,
  toRefs,
} from 'vue';
import { date, Dialog, Notify } from 'quasar';
import * as Types from '@/models/types';
import * as AdminModerationModel from '@/models/AdminModerator';

type PropsVue = Readonly<
  {
    modelValue: boolean;
  } & {
    lotId?: string | undefined;
  }
>;

export default defineComponent({
  name: 'DialogOrgModeration',

  props: {
    modelValue: {
      type: Boolean as PropType<boolean>,
      default: false,
    },
    lotId: {
      type: String,
    },
  },

  setup(props, ctx: SetupContext) {
    const base = useBase(props, ctx);

    return {
      ...base,
    };
  },
});

function useBase(props: PropsVue, ctx: SetupContext) {
  const dialogFlag = ref(false);

  const org = ref(null) as Ref<
    | null
    | (Types.TokenOriginalView & {
        User: Types.UserView;
        Lots: Types.LotView[]; // only active lots
        TokensNFT: Types.TokenNFTView & {
          User: Types.UserView;
        };
        TokenMedias: Types.TokenMediaView[];
      })
  >;
  const mainContent = ref(null) as Ref<Types.TokenMediaView | null>;
  const isCensored = ref('');

  async function openDialog() {
    dialogFlag.value = true;
    if (typeof props.lotId === 'string') {
      try {
        const { data } = await AdminModerationModel.getOrgById(props.lotId);

        mainContent.value = data.TokenMedias.filter((v) => v.isOriginal)[0] || null;
        isCensored.value = data.isUseCensored ? 'YES' : 'NO';

        org.value = data;
      } catch (error) {
        console.error(error);
      }
    }
  }

  function closeDialog() {
    dialogFlag.value = false;
    ctx.emit('close');
  }

  function orgConfirm() {
    if (!org.value) {
      return;
    }

    const orgView = org.value as Types.TokenOriginalView;

    Dialog.create({
      title: 'Confirmation',
      message: 'Will the original be confirmed?',
      ok: {
        label: 'Yes',
      },
      cancel: {
        label: 'Cancel',
      },
    }).onOk(async () => {
      await AdminModerationModel.orgConfirm(orgView.id);
      closeDialog();
      ctx.emit('needFetch');
    });
  }

  function orgToDraft() {
    if (!org.value) {
      return;
    }

    const orgView = org.value as Types.TokenOriginalView;

    Dialog.create({
      title: 'Confirmation',
      color: 'warning',
      message: 'Will the original be sent for revision?',
      ok: {
        label: 'Yes',
      },
      cancel: {
        label: 'Cancel',
      },
      prompt: {
        model: '',
        label: 'Message to author (Minimum 15 characters)',
        isValid: (val: string) => val.length > 15, // << here is the magic
        type: 'textarea',
      },
    }).onOk(async (data: string) => {
      await AdminModerationModel.orgToDraft(orgView.id, data);
      closeDialog();
      ctx.emit('needFetch');
    });
  }

  function orgDelete() {
    if (!org.value) {
      return;
    }

    const orgView = org.value as Types.TokenOriginalView;

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
    }).onOk(async () => {
      await AdminModerationModel.orgDelete(orgView.id);
      closeDialog();
      ctx.emit('needFetch');
    });
  }

  const { modelValue } = toRefs(props);
  let watchStop: WatchStopHandle;
  onMounted(() => {
    watchStop = watch(modelValue, (value) => {
      if (value) {
        void openDialog();
      }
    });
  });
  onUnmounted(() => {
    if (watchStop) {
      watchStop();
    }
  });

  return {
    dialogFlag,
    org,
    mainContent,
    isCensored,

    closeDialog,

    orgConfirm,
    orgToDraft,
    orgDelete,
    getContentType: AdminModerationModel.getContentType,
  };
}
</script>
