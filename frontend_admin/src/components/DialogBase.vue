<template>
  <q-dialog v-model="dialogFlag" @hide="closeDialog" persistent>
    <q-card style="width: 1440px; max-width: 100%;">
      <q-toolbar class="bg-primary glossy">
        <q-toolbar-title>
          Dialog base
        </q-toolbar-title>
        <q-btn flat round dense icon="close" v-close-popup />
      </q-toolbar>
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
  toRefs
} from 'vue';
import { date, Dialog, Notify } from 'quasar';

export interface Props {
  modelValue: boolean;
  lotId: string;
}
type PropsVue = Readonly<{
    modelValue: boolean;
} & {
    lotId?: string | undefined;
}>

export default defineComponent({
  name: 'DialogBase',

  props: {
    modelValue: {
      type: Boolean as PropType<boolean>,
      default: false
    },
    lotId: {
      type: String
    }
  },

  setup (props, ctx: SetupContext) {
    const base = useBase(props, ctx);
    return {
      ...base,
    };
  }
});

function useBase (props: PropsVue, ctx: SetupContext) {
  const dialogFlag = ref(false);

  async function openDialog () {
    dialogFlag.value = true;
  }

  function closeDialog () {
    dialogFlag.value = false;
    ctx.emit('close');
  }

  const { modelValue } = toRefs(props)
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
    closeDialog
  };
}
</script>
