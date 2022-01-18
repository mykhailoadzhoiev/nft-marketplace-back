import axios from 'axios';
import { createFormGenerator } from '../lib/form';
import { reactive } from 'vue';
import { UserView, TRes } from './types';

export function getCurrentUser(): TRes<
  UserView & {
    followingsCount: number;
    followersCount: number;
  }
> {
  return axios.get('/api/user');
}

export function logout(): TRes<unknown> {
  return axios.post('/api/user/logout');
}

/*
  formUpdateUserSetting
*/

export const formUpdateUserSetting = createFormGenerator<
  {
    email?: string;
    name?: string;
    metaName?: string;
    description?: string;
    socialTwitch?: string;
    socialInstagram?: string;
    socialTwitter?: string;
    socialOnlyfans?: string;
  },
  UserView
>(
  () => {
    return reactive({
      email: '',
      name: '',
      metaName: '',
      description: '',
      socialTwitch: '',
      socialInstagram: '',
      socialTwitter: '',
      socialOnlyfans: '',
    });
  },
  (model) => {
    return axios.post('/api/user/settings_update', model);
  }
);

/*
  uploadUserAvatarImage
*/

export function uploadUserAvatarImage(userAvata: File): TRes<{
  sha256: string;
}> {
  const formData = new FormData();
  formData.append('user_avatar', userAvata);
  return axios.post('/api/user/upload_avatar', formData);
}

/*
  deleteUserAvatar
*/

export function deleteUserAvatar(): TRes<{
  sha256: string;
}> {
  return axios.delete('/api/user/avatar');
}

/*
formChangeUserPassword
*/

export const formChangeUserPassword = createFormGenerator<
  {
    oldPassword: string;
    newPassword: string;
    newPasswordConfirmation: string;
  },
  UserView
>(
  () => {
    return reactive({
      oldPassword: '',
      newPassword: '',
      newPasswordConfirmation: '',
    });
  },
  (model) => {
    return axios.post('/api/user/change_password', model);
  }
);
