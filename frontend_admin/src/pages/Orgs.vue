<template>
  <q-page class="q-pa-md q-gutter-md">
    <q-expansion-item expand-separator icon="filter_alt" label="Filters" class="q-pa-sm">
      <q-input name="filterId" label="ID" v-model="filters.id" />

      <q-input name="filterUserId" label="UserID" v-model="filters.userId" />

      <q-select
        emit-value
        map-options
        name="filterStatus"
        label="Status"
        v-model="filters.status"
        :options="optionsStatus"
      >
        <template v-slot:append>
          <q-icon v-if="!!filters.status" name="close" @click.stop="filters.status = null" class="cursor-pointer" />
          <q-icon name="search" @click.stop />
        </template>
      </q-select>

      <q-select
        emit-value
        map-options
        name="filterContentTyoe"
        label="Content Type"
        v-model="filters.contentType"
        :options="optionsContentType"
      >
        <template v-slot:append>
          <q-icon
            v-if="!!filters.status"
            name="close"
            @click.stop="filters.contentType = null"
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
      title="Originals"
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
        <q-td :key="'user'" :props="props">
          <router-link :to="{ path: '/users/' + props.row.User.id }">User {{ props.row.User.id }}</router-link>
        </q-td>
      </template>

      <template v-slot:body-cell-createdAt="props">
        <q-td :key="'createdAt'" :props="props">
          {{ toDateFormat(props.row.createdAt) }}
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :key="'actions'" :props="props">
          <q-btn round flat color="negative" icon="delete" title="Delete" @click="orgDelete(props.row)" />
        </q-td>
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
import * as AdminModerationModel from '@/models/AdminModerator';
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

  const rows = ref([]) as Ref<Types.TokenOriginalView[]>;

  const loading = ref(false);

  const columns = [
    { name: 'id', label: 'ID', field: 'id', sortable: true },
    { name: 'type', label: 'Type', field: 'type', sortable: false },
    { name: 'status', label: 'Status', field: 'status', sortable: false },
    { name: 'contentType', label: 'Content Type', field: 'contentType', sortable: false },
    { name: 'name', label: 'Name', field: 'name', sortable: false },
    { name: 'user', label: 'User', field: 'user', sortable: false },
    { name: 'createdAt', label: 'Created At', field: 'createdAt', sortable: true },
    { name: 'actions', label: 'Actions' },
  ];

  const optionsContentType = [
    { label: 'IMAGE', value: Types.MediaType.IMAGE },
    { label: 'VIDEO', value: Types.MediaType.VIDEO },
    { label: 'AUDIO', value: Types.MediaType.IMAGE },
  ];

  const optionsStatus = [
    { label: 'BAN', value: Types.TokenOriginalStatus.BAN },
    { label: 'DRAFT', value: Types.TokenOriginalStatus.DRAFT },
    { label: 'IMPORT_TASK', value: Types.TokenOriginalStatus.IMPORT_TASK },
    // { label: 'IMPORT_FAIL', value: Types.TokenOriginalStatus.IMPORT_FAIL },
    { label: 'VALIDATION', value: Types.TokenOriginalStatus.VALIDATION },
    { label: 'TASK', value: Types.TokenOriginalStatus.TASK },
    { label: 'PUBLISHED', value: Types.TokenOriginalStatus.PUBLISHED },
  ];

  const filters = reactive({
    id: '',
    userId: '',
    status: null as null | Types.TokenOriginalStatus,
    contentType: null as null | Types.MediaType,
    name: '',
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
    filters.userId = '';
    filters.status = null;
    filters.contentType = null;
    filters.name = '';
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
    if (filters.userId) {
      newQuery.userId = filters.userId;
    }
    if (filters.status) {
      newQuery.status = filters.status;
    }
    if (filters.contentType) {
      newQuery.contentType = filters.contentType;
    }
    if (filters.name) {
      newQuery.name = filters.name;
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
    };
    if (filters.id) {
      fetchParams.id = filters.id;
    }
    if (filters.userId) {
      fetchParams.userId = filters.userId;
    }
    if (filters.status) {
      fetchParams.status = filters.status;
    }
    if (filters.contentType) {
      fetchParams.contentType = filters.contentType;
    }
    if (filters.name) {
      fetchParams.name = filters.name;
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

  function orgDelete(org: any) {
    const orgView = org as Types.TokenOriginalView;

    Dialog.create({
      title: 'Confirmation',
      color: 'negative',
      message: 'Are you sure you should delete the original?',
      ok: {
        label: 'Yes',
      },
      cancel: {
        label: 'Cancel',
      },
      prompt: {
        model: '',
        label: 'Enter "DELETE" for allow delete original',
        isValid: (val: string) => val === 'DELETE', // << here is the magic
        type: 'text',
      },
    }).onOk(async () => {
      await AdminModerationModel.orgDelete(orgView.id);
      await fetch();
      Notify.create({
        message: `Original ${orgView.id} deleted`,
        color: 'negative',
        position: 'top-right',
      });
    });
  }

  onMounted(async () => {
    useMeta({
      title: 'Originals',
    });

    const query = $route.query;

    pagination.value.page = typeof query.page === 'string' ? parseInt(query.page) : 1;
    pagination.value.rowsPerPage = typeof query.pageSize === 'string' ? parseInt(query.pageSize) : 20;
    pagination.value.sortBy = typeof query.sortBy === 'string' ? query.sortBy : null;
    pagination.value.descending = !(typeof query.sortType === 'string' && query.sortType === 'asc');

    filters.id = typeof query.id === 'string' ? query.id : '';
    filters.userId = typeof query.userId === 'string' ? query.userId : '';
    filters.name = typeof query.name === 'string' ? query.name : '';

    if (
      query.status &&
      typeof query.status === 'string' &&
      Object.values(Types.TokenOriginalStatus).indexOf(query.status as Types.TokenOriginalStatus) !== -1
    ) {
      filters.status = query.status as Types.TokenOriginalStatus;
    }

    if (
      query.contentType &&
      typeof query.contentType === 'string' &&
      Object.values(Types.MediaType).indexOf(query.contentType as Types.MediaType) !== -1
    ) {
      filters.contentType = query.contentType as Types.MediaType;
    }

    await fetch();
  });

  return {
    key,
    rows,
    loading,
    columns,
    optionsContentType,
    optionsStatus,
    filters,
    pagination,

    search,
    clearFilters,
    fetch,
    orgDelete,

    toDateFormat: useToDateFormat().toDateFormat,
  };
}
</script>
