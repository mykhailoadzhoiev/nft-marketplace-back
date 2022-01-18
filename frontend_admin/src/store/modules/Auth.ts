import { Cookies } from 'quasar';
import { reactive } from 'vue';
import * as UserModel from '@/models/User';
import { LoginData, UserView } from '@/models/types';

const TOKEN_KEY = 'admin-token';
const REFRESH_KEY = 'admin-refresh';
const EXPIRATION_TS_KEY = 'admin-expirationTs';

export default class AuthModule {
  private state = reactive({
    token: null as string | null,
    refreshToken: null as string | null,
    expirationTs: null as number | null,
    user: null as UserView | null,
  });

  async init() {
    this.state.token = Cookies.get(TOKEN_KEY);
    await this.fetchUser();
  }

  get token() {
    this.state.token = Cookies.get(TOKEN_KEY);
    return this.state.token;
  }

  get refreshToken() {
    this.state.refreshToken = Cookies.get(REFRESH_KEY);
    return this.state.refreshToken;
  }

  get expirationTs() {
    this.state.expirationTs = Cookies.get(EXPIRATION_TS_KEY);
    return this.state.expirationTs;
  }

  get isAuth() {
    return !!this.token;
  }

  get isAuthAndLoad() {
    return !!this.token && !!this.state.user;
  }

  get user(): UserView | null {
    return this.state.user;
  }

  async getUser() {
    if (this.isAuth) {
      if (!this.user) {
        return await this.fetchUser();
      }
      return this.user;
    } else {
      return null;
    }
  }

  setLogin(loginData: LoginData) {
    Cookies.set(TOKEN_KEY, loginData.token);
    this.state.token = loginData.token;

    Cookies.set(REFRESH_KEY, loginData.refreshToken);
    this.state.refreshToken = loginData.refreshToken;

    Cookies.set(EXPIRATION_TS_KEY, JSON.stringify(loginData.expirationTs));
    this.state.expirationTs = loginData.expirationTs;

    this.state.user = loginData.user;
  }

  clearData() {
    Cookies.remove(TOKEN_KEY);
    Cookies.remove(REFRESH_KEY);
    Cookies.remove(EXPIRATION_TS_KEY);
    this.state.token = null;
    this.state.refreshToken = null;
    this.state.expirationTs = null;
    this.state.user = null;
  }

  async fetchUser() {
    if (this.isAuth) {
      try {
        const { data } = await UserModel.getCurrentUser();
        this.state.user = data;
        return this.state.user;
      } catch (error) {
        console.log(error);
      }
    }
  }

  logout() {
    this.clearData();
  }
}
