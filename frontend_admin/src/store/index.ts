import AuthModule from './modules/Auth';

class MyStore {
  auth: AuthModule;

  constructor() {
    this.auth = new AuthModule();
  }
}

const Store = new MyStore();

export default function store() {
  return Store;
}

export function useStore() {
  return Store;
}
