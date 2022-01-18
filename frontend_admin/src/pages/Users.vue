<template>
  <q-page class="q-pa-md q-gutter-md">
    <q-expansion-item expand-separator icon="filter_alt" label="Filters" class="q-pa-sm">
      <q-input name="filterId" label="ID" v-model="filters.id" />

      <q-input name="filterMetamaskAddress" label="Addr" v-model="filters.metamaskAddress" />

      <q-select emit-value map-options name="filterRole" label="Role" v-model="filters.role" :options="optionsRole">
        <template v-slot:append>
          <q-icon v-if="!!filters.role" name="cancel" @click.stop="filters.role = null" class="cursor-pointer" />
          <q-icon name="search" @click.stop />
        </template>
      </q-select>

      <q-select
        emit-value
        map-options
        name="filterIsFeatured"
        label="Is Featured"
        v-model="filters.isFeatured"
        :options="optionsIsFeatured"
      >
        <template v-slot:append>
          <q-icon
            v-if="typeof filters.isFeatured === 'boolean'"
            name="cancel"
            @click.stop="filters.isFeatured = null"
            class="cursor-pointer"
          />
          <q-icon name="search" @click.stop />
        </template>
      </q-select>

      <div class="q-mt-sm">
        <q-btn @click="search" label="Searh" />
        <q-btn @click="clearFilters" label="reset" />
      </div>
    </q-expansion-item>

    <q-table
      :key="key"
      class="q-mt-md"
      title="Users"
      :rows="rows"
      :columns="columns"
      row-key="id"
      v-model:pagination="pagination"
      :rows-per-page-options="[5, 10, 20, 50]"
      :loading="loading"
      @request="fetch"
    >
      <template v-slot:body-cell-id="props">
        <q-td :key="'id'" :props="props">
          <router-link :to="{ path: '/users/' + props.row.id }">{{ props.row.id }}</router-link>
        </q-td>
      </template>

      <template v-slot:body-cell-avatar="props">
        <q-td :key="'avatar'" :props="props">
          <q-avatar>
            <img
              :src="props.row.avatar ? '/sha256/' + props.row.avatar : 'https://cdn.quasar.dev/img/boy-avatar.png'"
            />
          </q-avatar>
        </q-td>
      </template>

      <template v-slot:body-cell-metamaskAddress="props">
        <q-td :key="'metamaskAddress'" :props="props">
          <span v-if="props.row.metamaskAddress">
            <a :href="'https://bscscan.com/address/' + props.row.metamaskAddress" target="blank">{{
              props.row.metamaskAddress
            }}</a>
          </span>
          <span v-else> N/A </span>
        </q-td>
      </template>

      <template v-slot:body-cell-createdAt="props">
        <q-td :key="'createdAt'" :props="props">
          {{ toDateFormat(props.row.createdAt) }}
        </q-td>
      </template>

      <template v-slot:body-cell-featuredIndex="props">
        <q-td :key="'featuredIndex'" :props="props">
          <div class="row" v-if="props.row.role === 'USER'">
            <q-input
              label="Index"
              v-model.number="props.row.featuredIndex"
              type="number"
              filled
              dense
              flat
              style="max-width: 60px"
              min="0"
            />
            <q-btn
              rounded
              dense
              title="Set null for featured index"
              icon="cancel"
              @click="props.row.featuredIndex = null"
            />
            <q-btn
              rounded
              dense
              icon="save"
              title="Update user featured index"
              @click="postSetFeaturedIndex(props.row)"
            />
          </div>
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :key="'actions'" :props="props"> </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script lang="ts">
import { useMeta } from 'quasar';
import { defineComponent, ref, Ref, onMounted, reactive } from 'vue';
import * as Types from '@/models/types';
import * as AdminModeratorModel from '@/models/AdminModerator';
import { useRoute, useRouter } from 'vue-router';
import { useToDateFormat } from '@/hooks/common';
import { date, Dialog, Notify } from 'quasar';

export default defineComponent({
  name: 'PageOrgsAll',

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

  const key = ref(Date.now());

  const rows = ref([]) as Ref<Types.UserView[]>;

  const loading = ref(false);

  const columns = [
    { name: 'id', label: 'ID', field: 'id', sortable: true },
    { name: 'avatar', label: 'Avatar', field: 'avatar', sortable: false },
    { name: 'role', label: 'Role', field: 'role', sortable: false },
    { name: 'email', label: 'Email', field: 'email', sortable: false },
    {
      name: 'metamaskAddress',
      label: 'Addr',
      field: 'metamaskAddress',
      sortable: false,
    },
    { name: 'metaName', label: '@', field: 'metaName', sortable: false },
    {
      name: 'createdAt',
      label: 'Created At',
      field: 'createdAt',
      sortable: true,
    },
    { name: 'featuredIndex', label: 'Featured', field: 'featuredIndex', sortable: true },
    // { name: 'actions', label: 'Actions' }
  ];

  const optionsRole = [
    { label: 'GUEST', value: Types.UserRole.Guest },
    { label: 'USER', value: Types.UserRole.User },
    { label: 'MODERATOR', value: Types.UserRole.Moderator },
    { label: 'ADMIN', value: Types.UserRole.Admin },
  ];

  const optionsIsFeatured = [
    { label: 'Yes', value: true },
    { label: 'No', value: false },
  ];

  const filters = reactive({
    id: '',
    email: '',
    role: null as Types.UserRole | null,
    name: '',
    metamaskAddress: '',
    metaName: '',
    isFeatured: null as boolean | null,
  });

  const pagination = ref({
    sortBy: null as string | null,
    descending: null as boolean | null,
    page: 1 as number,
    rowsPerPage: 20 as number,
    rowsNumber: 10 as number,
  });

  async function search() {
    await fetch();
  }

  async function clearFilters() {
    filters.id = '';
    filters.email = '';
    filters.role = null;
    filters.name = '';
    filters.metamaskAddress = '';
    filters.metaName = '';
    filters.isFeatured = null;
    await fetch();
  }

  function updateRouteQuery() {
    const newQuery: { [name: string]: string } = {
      page: pagination.value.page.toString(),
      pageSize: pagination.value.rowsPerPage.toString(),
    };
    if (pagination.value.sortBy) {
      newQuery.sortBy = pagination.value.sortBy;
      newQuery.sortType = pagination.value.descending ? 'desc' : 'asc';
    }
    if (filters.id) {
      newQuery.id = filters.id;
    }
    if (filters.email) {
      newQuery.email = filters.email;
    }
    if (filters.role) {
      newQuery.role = filters.role;
    }
    if (filters.name) {
      newQuery.name = filters.name;
    }
    if (filters.metamaskAddress) {
      newQuery.metamaskAddress = filters.metamaskAddress;
    }
    if (filters.metaName) {
      newQuery.metaName = filters.metaName;
    }
    if (typeof filters.isFeatured === 'boolean') {
      newQuery.isFeatured = filters.isFeatured ? '1' : '0';
    }

    try {
      if (JSON.stringify(newQuery) !== JSON.stringify($route.query)) {
        void $router.push({
          ...$router.currentRoute,
          name: $router.currentRoute.value.name || '',
          query: newQuery,
        });
      }
    } catch (e) {}
  }

  async function fetch(props?: {
    pagination: {
      sortBy: string | null;
      descending: boolean | null;
      page: number;
      rowsPerPage: number;
      rowsNumber: number;
    };
  }) {
    if (!props) {
      props = {
        pagination: pagination.value,
      };
    }

    const fetchParams: AdminModeratorModel.ParamsGetFetchUsers = {
      page: props.pagination.page.toString(),
      pageSize: props.pagination.rowsPerPage.toString(),
      sortBy: props.pagination.sortBy as 'id' | 'role' | 'email' | 'name' | 'createdAt' | 'featuredIndex',
      sortDesc: props.pagination.descending ? '1' : '0',
    };
    if (filters.id) {
      fetchParams.id = filters.id;
    }
    if (filters.email) {
      fetchParams.email = filters.email;
    }
    if (filters.role) {
      fetchParams.role = filters.role;
    }
    if (filters.name) {
      fetchParams.name = filters.name;
    }
    if (filters.metamaskAddress) {
      fetchParams.metamaskAddress = filters.metamaskAddress;
    }
    if (filters.metaName) {
      fetchParams.metaName = filters.metaName;
    }
    if (typeof filters.isFeatured === 'boolean') {
      fetchParams.isFeatured = filters.isFeatured ? '1' : '0';
    }

    loading.value = true;

    try {
      const { data } = await AdminModeratorModel.getFetchUsers(fetchParams);

      pagination.value.rowsNumber = data.totalRows;
      pagination.value.page = data.page;
      pagination.value.rowsPerPage = data.pageSize;
      pagination.value.sortBy = data.sortBy;
      pagination.value.descending = data.sortDesc;
      rows.value = data.rows;

      updateRouteQuery();
    } catch (error) {
      console.error(error);
    }

    loading.value = false;
  }

  async function postSetFeaturedIndex(user: Types.UserView) {
    try {
      await AdminModeratorModel.postSetFeaturedIndex(user.id, user.featuredIndex || null);
      Notify.create({
        message: 'Featured index updated',
        color: 'secondary',
        position: 'top-right',
      });
    } catch (error) {
      console.error(error);
    }
  }

  onMounted(async () => {
    useMeta({
      title: 'Users',
    });

    const query = $route.query;

    pagination.value.page = typeof query.page === 'string' ? parseInt(query.page) : 1;
    pagination.value.rowsPerPage = typeof query.pageSize === 'string' ? parseInt(query.pageSize) : 20;
    pagination.value.sortBy = typeof query.sortBy === 'string' ? query.sortBy : null;
    pagination.value.descending = !(typeof query.sortType === 'string' && query.sortType === 'asc');

    filters.id = typeof query.id === 'string' ? query.id : '';
    filters.email = typeof query.email === 'string' ? query.email : '';
    filters.name = typeof query.name === 'string' ? query.name : '';
    filters.metamaskAddress = typeof query.metamaskAddress === 'string' ? query.metamaskAddress : '';
    filters.metaName = typeof query.metaName === 'string' ? query.metaName : '';

    if (query.isFeatured === '1') {
      filters.isFeatured = true;
    } else if (query.isFeatured === '0') {
      filters.isFeatured = false;
    } else {
      filters.isFeatured = null;
    }

    if (
      query.role &&
      typeof query.role === 'string' &&
      Object.values(Types.UserRole).indexOf(query.role as Types.UserRole) !== -1
    ) {
      filters.role = query.role as Types.UserRole;
    }

    await fetch();
  });

  return {
    key,
    rows,
    loading,
    columns,
    optionsRole,
    optionsIsFeatured,
    filters,
    pagination,

    search,
    clearFilters,
    fetch,
    postSetFeaturedIndex,

    toDateFormat: useToDateFormat().toDateFormat,
  };
}
</script>
