<template>
  <q-page class="q-pa-md q-gutter-md">
    <q-table
      :key="key"
      class="q-mt-md"
      title="Originals for moderation"
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
          <router-link :to="{ path: '/orgs/' + props.row.id }">{{ props.row.id }}</router-link>
        </q-td>
      </template>

      <template v-slot:body-cell-name="props">
        <q-td :key="'name'" :props="props">
          {{ props.row.name }}
        </q-td>
      </template>

      <template v-slot:body-cell-user="props">
        <q-td :key="'user'" :props="props"> User{{ props.row.User.id }} </q-td>
      </template>

      <template v-slot:body-cell-createdAt="props">
        <q-td :key="'createdAt'" :props="props">
          {{ toDateFormat(props.row.createdAt) }}
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :key="'actions'" :props="props">
          <q-btn round flat icon="visibility" @click="openDialogOrgModeration(props.row.id)" />
        </q-td>
      </template>
    </q-table>

    <DialogOrgModeration
      :modelValue="dialogOrgModerationFlag"
      :lotId="dialogOrgId"
      @close="dialogOrgModerationFlag = false"
      @needFetch="dialogLotModerationNeedFetch"
    />
  </q-page>
</template>

<script lang="ts">
import { useMeta } from 'quasar';
import { defineComponent, ref, Ref, onMounted, reactive } from 'vue';
import * as Types from '@/models/types';
import * as AdminModeratorModel from '@/models/AdminModerator';
import { useRoute, useRouter } from 'vue-router';
import { useToDateFormat } from '@/hooks/common';
import DialogOrgModeration from '@/components/DialogOrgModeration.vue';

export default defineComponent({
  name: 'PageOrgsForModeration',

  components: {
    DialogOrgModeration,
  },

  props: {},

  setup() {
    const base = useBase();
    const dialogOrgModeration = useDialogOrgModeration(base);
    return {
      ...base,
      ...dialogOrgModeration,
    };
  },
});

function useBase() {
  const $route = useRoute();
  const $router = useRouter();

  const key = ref(Date.now());

  const rows = ref([]) as Ref<Types.TokenOriginalView[]>;

  const loading = ref(false);

  const columns = [
    { name: 'id', label: 'ID', field: 'id', sortable: true },
    { name: 'type', label: 'Type', field: 'type', sortable: false },
    { name: 'name', label: 'Name', field: 'name', sortable: false },
    { name: 'user', label: 'User', field: 'user', sortable: false },
    { name: 'createdAt', label: 'Created At', field: 'createdAt', sortable: true },
    { name: 'actions', label: 'Actions' },
  ];

  const filters = reactive({
    name: '',
    userId: '',
    categoryId: '',
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
    filters.name = '';
    (filters.userId = ''), (filters.categoryId = '');
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
    if (filters.name) {
      newQuery.name = filters.name;
    }
    if (filters.userId) {
      newQuery.userId = filters.userId;
    }
    if (filters.categoryId) {
      newQuery.categoryId = filters.categoryId;
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

    const fetchParams: AdminModeratorModel.ParamsGetFetchOrgs = {
      page: props.pagination.page.toString(),
      pageSize: props.pagination.rowsPerPage.toString(),
      sortBy: props.pagination.sortBy as
        | 'id'
        | 'expiresAt'
        | 'lastActiveAt'
        | 'updatedAt'
        | 'createdAt'
        | 'currentCost',
      sortDesc: props.pagination.descending ? '1' : '0',

      status: Types.TokenOriginalStatus.VALIDATION,
    };
    if (filters.name) {
      fetchParams.name = filters.name;
    }
    if (filters.userId) {
      fetchParams.userId = filters.userId;
    }
    if (filters.categoryId) {
      fetchParams.categoryId = filters.categoryId;
    }

    loading.value = true;

    try {
      const { data } = await AdminModeratorModel.getFetchOrgs(fetchParams);

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

  onMounted(async () => {
    useMeta({
      title: 'Originals for moderation',
    });

    const query = $route.query;

    pagination.value.page = typeof query.page === 'string' ? parseInt(query.page) : 1;
    pagination.value.rowsPerPage = typeof query.pageSize === 'string' ? parseInt(query.pageSize) : 20;
    pagination.value.sortBy = typeof query.sortBy === 'string' ? query.sortBy : null;
    pagination.value.descending = !(typeof query.sortType === 'string' && query.sortType === 'asc');

    filters.name = typeof query.name === 'string' ? query.name : '';
    filters.userId = typeof query.userId === 'string' ? query.userId : '';
    filters.categoryId = typeof query.categoryId === 'string' ? query.categoryId : '';

    await fetch();
  });

  return {
    key,
    rows,
    loading,
    columns,
    filters,
    pagination,

    search,
    clearFilters,
    fetch,

    toDateFormat: useToDateFormat().toDateFormat,
  };
}

export function useDialogOrgModeration(base: { fetch: () => Promise<void> }) {
  const dialogOrgModerationFlag = ref(false);
  const dialogOrgId: Ref<string | null> = ref(null);

  function openDialogOrgModeration(lotId: string) {
    dialogOrgId.value = lotId;
    dialogOrgModerationFlag.value = true;
  }

  async function dialogLotModerationNeedFetch() {
    await base.fetch();
  }

  return {
    dialogOrgModerationFlag,
    dialogOrgId,

    openDialogOrgModeration,
    dialogLotModerationNeedFetch,
  };
}
</script>
