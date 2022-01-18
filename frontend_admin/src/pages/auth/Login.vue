<template>
  <q-page class="q-pa-md" style="margin: 0 auto; max-width: 400px">
    <q-form @submit.prevent="onSubmit">
      <q-card>
        <q-card-section>
          <q-input
            filled
            name="email"
            label="Email"
            v-model="form.model.email"
            :error="form.hasFieldError('email')"
          >
            <template v-slot:error>
              <div
                v-for="error in form.getFieldErrors('email', true)"
                :key="error"
              >{{ $t('formsErrors.' + error) }}</div>
            </template>
          </q-input>

          <q-input
            filled
            name="password"
            type="password"
            label="Password"
            v-model="form.model.password"
            :error="form.hasFieldError('password')"
          >
            <template v-slot:error>
              <div
                v-for="error in form.getFieldErrors('password', true)"
                :key="error"
              >{{ $t('formsErrors.' + error) }}</div>
            </template>
          </q-input>

          <div class="q-mt-sm">
            <q-btn :disable="form.isBosy" label="Login" type="submit" color="primary" />
          </div>
        </q-card-section>
      </q-card>
    </q-form>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref, Ref, SetupContext, reactive, onMounted } from 'vue';
import { useStore } from '@/store';
import { useRouter } from 'vue-router';
import * as Types from '@/models/types';
import * as GuestModel from '@/models/Guest';
import { useMeta } from 'quasar';

export interface Props {}

function useBase (props: Props, ctx: SetupContext) {
  const store = useStore();
  const ruter = useRouter();
  const form = GuestModel.adminLoginForm.generateForm();

  async function onSubmit () {
    form.clearErrors();
    try {
      store.auth.logout();
      const { data } = await form.submit();
      if (data && data.user.role === Types.UserRole.Admin) {
        store.auth.setLogin(data);
        await store.auth.fetchUser();
        await ruter.push({ path: '/' });
      }
    } catch (error) {
      console.error(error);
    }
  }

  onMounted(() => {
    useMeta({
      title: 'Admin Market NFT'
    });
  });

  return {
    form,
    onSubmit
  };
}

export default defineComponent({
  setup (props: Props, ctx) {
    const base = useBase(props, ctx);
    return {
      ...base
    }
  }
})
</script>