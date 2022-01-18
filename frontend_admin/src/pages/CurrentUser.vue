<template>
  <q-page class="q-pa-md">
    <section v-if="user" class="q-gutter-md">

      <q-card title="Avatar form">
        <q-card-section>
          <h6>Avatar form</h6>

          <div>
            <q-avatar size="56px" class="q-mb-sm">
              <img :src="user.avatar ? '/sha256/' + user.avatar : 'https://cdn.quasar.dev/img/boy-avatar.png'">
            </q-avatar>
          </div>

          <div class="q-gutter-md q-mt-md">
            <q-file 
              clearable filled color="pink" 
              v-model="userAvatarImage" 
              label="Avatar Image" 
            />
            <q-btn 
              label="Update User Avatar"
              @click="updateUserAvatar"
              :disabled="!userAvatarImage"
            />
          </div>
        </q-card-section>
      </q-card>

      <q-card title="Change data form">
        <q-card-section>
          <h6>Change data form</h6>

          <q-form @submit.prevent="updateUserInfo">
            <q-input label="Email" v-model="form.model.email" />

            <q-input label="name" v-model="form.model.name" />

            <q-input type="textarea" label="Desciption" v-model="form.model.description" />

            <q-btn label="Update User Info" type="submit" />
          </q-form>
        </q-card-section>
      </q-card>

      <q-card title="Change password form">
        <q-card-section>
          <h6>Change password form</h6>

          <q-form @submit.prevent="changePassSubmit">
            <q-input
              filled
              name="oldPassword"
              type="password"
              label="Old password"
              v-model="changePassForm.model.oldPassword"
              :error="changePassForm.hasFieldError('oldPassword')"
            >
              <template v-slot:error>
                <div
                  v-for="error in changePassForm.getFieldErrors('oldPassword', true)"
                  :key="error"
                >{{ $t('formsErrors.' + error) }}</div>
              </template>
            </q-input>

            <q-input
              filled
              name="newPassword"
              type="password"
              label="New password"
              v-model="changePassForm.model.newPassword"
              :error="changePassForm.hasFieldError('newPassword')"
            >
              <template v-slot:error>
                <div
                  v-for="error in changePassForm.getFieldErrors('newPassword', true)"
                  :key="error"
                >{{ $t('formsErrors.' + error) }}</div>
              </template>
            </q-input>

            <q-input
              filled
              name="newPasswordConfirmation"
              type="password"
              label="New password again"
              v-model="changePassForm.model.newPasswordConfirmation"
              :error="changePassForm.hasFieldError('newPasswordConfirmation')"
            >
              <template v-slot:error>
                <div
                  v-for="error in changePassForm.getFieldErrors('newPasswordConfirmation', true)"
                  :key="error"
                >{{ $t('formsErrors.' + error) }}</div>
              </template>
            </q-input>

            <div class="q-mt-sm">
              <q-btn :disable="changePassForm.isBosy" label="Send" type="submit" color="primary" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>

    </section>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref, Ref, computed, onMounted, reactive } from 'vue';
import { useStore } from '../store';
import * as UserModel from '../models/User'; 
import { Dialog, Notify } from 'quasar';

export default defineComponent({
  name: 'PageProfile',

  setup() {
    const base = useBase();

    return {
      ...base
    };
  }
});

function useBase() {
  const store = useStore();

  const user = computed(() => {
    return store.auth.user;
  });

  const form = UserModel.formUpdateUserSetting.generateForm();
  const userAvatarImage = ref(null) as Ref<File | null>;

  async function updateUserInfo () {
    try {
      await form.submit();
      await store.auth.fetchUser();
      Notify.create({
        message: 'Data updated',
        color: 'secondary',
        position: 'top-right'
      });
    } catch (error) {
      console.log(error);
    }
  }

  async function updateUserAvatar () {
    try {
      if (userAvatarImage.value) {
        await UserModel.uploadUserAvatarImage(userAvatarImage.value);
        await store.auth.fetchUser();
        Notify.create({
          message: 'Avatar updated',
          color: 'secondary',
          position: 'top-right'
        });
      }
    } catch (error) {
      console.log(error);
    }
  }

  function updateFormData () {
    const user = store.auth.user;

    console.log(user);

    if (user) {
      form.model.email = user.email;
      form.model.name = user.name;
      form.model.metaName = user.metaName || '';
      form.model.description = user.description;
      form.model.socialTwitch = user.socialTwitch;
      form.model.socialInstagram = user.socialInstagram;
      form.model.socialTwitter = user.socialTwitter;
      form.model.socialOnlyfans = user.socialOnlyfans;
    }
  }

  const changePassForm = UserModel.formChangeUserPassword.generateForm();

  async function changePassSubmit () {
    try {
      await changePassForm.submit();
      changePassForm.reset();
      Dialog.create({
        title: '',
        message: 'Password changed',
      });
    } catch (error) {
      console.error(error);
    }
  }

  onMounted(async () => {
    await store.auth.fetchUser();
    updateFormData();
  });

  return {
    user,
    form,
    userAvatarImage,

    updateUserInfo,
    updateUserAvatar,
    changePassSubmit,
    changePassForm
  };
}
</script>
