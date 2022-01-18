import { boot } from 'quasar/wrappers';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Dialog } from 'quasar';
import { useStore } from '../store';
import { LoginData } from '@/models/types';

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
  }
}

export default boot(({ app, router }) => {
  const authStore = useStore().auth;

  axios.interceptors.request.use(async (request) => {
    let token = authStore.token;
    const expirationTs = authStore.expirationTs;

    if (expirationTs && Date.now() >= expirationTs - 1000 * 60 * 1) {
      const refreshToken = authStore.refreshToken;
      if (refreshToken) {
        try {
          const axiosForRefresh = axios.create();
          const { data } = (await axiosForRefresh.post('/api/refresh_token', {
            refreshToken,
          })) as AxiosResponse<LoginData>;
          authStore.setLogin(data);
          token = authStore.token;
        } catch (error) {
          authStore.logout();
        }
      }
    }

    request.headers;

    if (token && request.headers) {
      request.headers['Authorization'] = `Bearer ${token}`;
    }

    return request;
  });

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      const { status, data } = error.response;

      if (status >= 500) {
        Dialog.create({
          title: 'Error',
          message: 'Bad Server Status',
        });
      } else if (status === 401) {
        useStore().auth.clearData();
        Dialog.create({
          title: 'Error',
          message: 'No auth',
        }).onDismiss(() => {
          void router.push({ path: '/' });
        });
      }

      return Promise.reject(error);
    }
  );

  // for use inside Vue files (Options API) through this.$axios and this.$api

  app.config.globalProperties.$axios = axios;
  // ^ ^ ^ this will allow you to use this.$axios (for Vue Options API form)
  //       so you won't necessarily have to import axios in each vue file
});
