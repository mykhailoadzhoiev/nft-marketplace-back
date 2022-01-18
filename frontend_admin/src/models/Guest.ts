import axios, { AxiosResponse } from 'axios';
import { LoginData } from './types';
import { createFormGenerator } from '@/lib/form';
import { reactive } from 'vue';

const API_PATH = '/api/guest';

export const adminLoginForm = createFormGenerator<
  {
    email: string;
    password: string;
  },
  LoginData
>(
  () => {
    return reactive({
      email: '',
      password: '',
    });
  },
  (model) => {
    return axios.post(API_PATH + '/admin_login', model);
  }
);
