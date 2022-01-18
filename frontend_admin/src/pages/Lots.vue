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

      <div class="q-mt-sm">
        <q-btn @click="search" label="Searh" />
        <q-btn @click="clearFilters" label="reset" />
      </div>
    </q-expansion-item>

    <q-table
      :key="key"
      class="q-mt-md"
      title="Lots"
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
          <router-link :to="{ path: '/lots/' + props.row.id }">{{ props.row.id }}</router-link>
        </q-td>
      </template>

      <template v-slot:body-cell-name="props">
        <q-td :key="'name'" :props="props">
          {{ props.row.name }}
        </q-td>
      </template>

      <template v-slot:body-cell-userId="props">
        <q-td :key="'userId'" :props="props">
          <router-link :to="{ path: '/users/' + props.row.User.id }">User {{ props.row.User.id }}</router-link>
        </q-td>
      </template>

      <template v-slot:body-cell-createdAt="props">
        <q-td :key="'createdAt'" :props="props">
          {{ toDateFormat(props.row.createdAt) }}
        </q-td>
      </template>

      <template v-slot:body-cell-isTop="props">
        <q-td :key="'isTop'" :props="props">
          <q-toggle
            v-model="props.row.isTop"
            color="primary"
            @update:model-value="toggleLotIsTop(props.row)"
            :disable="props.row.status !== 'IN_SALES'"
          />
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

  const rows = ref([]) as Ref<Types.LotView[]>;

  const loading = ref(false);

  const columns = [
    { name: 'id', label: 'ID', field: 'id', sortable: true },
    { name: 'status', label: 'Status', field: 'status', sortable: true },
    { name: 'userId', label: 'User', field: 'userId', sortable: true },
    { name: 'createdAt', label: 'Created At', field: 'createdAt', sortable: true },
    { name: 'isTop', label: 'Is Top', field: 'isTop', sortable: true },
    // { name: 'actions', label: 'Actions' }
  ];

  const optionsStatus = [
    { label: 'CLOSED', value: Types.LotStatus.CLOSED },
    { label: 'IS_SALES', value: Types.LotStatus.IN_SALES },
  ];

  const filters = reactive({
    id: '',
    userId: '',
    categoryId: '',
    status: null as null | Types.LotStatus,
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
    if (filters.id) {
      newQuery.id = filters.id;
    }
    if (filters.userId) {
      newQuery.userId = filters.userId;
    }
    if (filters.categoryId) {
      newQuery.categoryId = filters.categoryId;
    }
    if (filters.status) {
      newQuery.status = filters.status;
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

    const fetchParams: AdminModeratorModel.ParamsGetFetchLots = {
      page: props.pagination.page.toString(),
      pageSize: props.pagination.rowsPerPage.toString(),
      sortBy: props.pagination.sortBy as
        | 'id'
        | 'status'
        | 'userId'
        | 'lastActiveAt'
        | 'updatedAt'
        | 'currentCost'
        | 'isTop',
      sortDesc: props.pagination.descending ? '1' : '0',
    };
    if (filters.id) {
      fetchParams.id = filters.id;
    }
    if (filters.userId) {
      fetchParams.userId = filters.userId;
    }
    if (filters.categoryId) {
      fetchParams.categoryId = filters.categoryId;
    }
    if (filters.status) {
      fetchParams.status = filters.status;
    }

    loading.value = true;

    try {
      const { data } = await AdminModeratorModel.getFetchLots(fetchParams);

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

  async function toggleLotIsTop(lot: Types.LotView) {
    try {
      const { data } = await AdminModerationModel.postToggleIsTop(lot.id);
      lot.isTop = data.isTop;
    } catch (error) {
      console.error(error);
    }
  }

  onMounted(async () => {
    useMeta({
      title: 'Lots',
    });

    const query = $route.query;

    pagination.value.page = typeof query.page === 'string' ? parseInt(query.page) : 1;
    pagination.value.rowsPerPage = typeof query.pageSize === 'string' ? parseInt(query.pageSize) : 20;
    pagination.value.sortBy = typeof query.sortBy === 'string' ? query.sortBy : null;
    pagination.value.descending = !(typeof query.sortType === 'string' && query.sortType === 'asc');

    filters.id = typeof query.id === 'string' ? query.id : '';
    filters.userId = typeof query.userId === 'string' ? query.userId : '';
    filters.categoryId = typeof query.categoryId === 'string' ? query.categoryId : '';

    if (
      query.status &&
      typeof query.status === 'string' &&
      Object.values(Types.LotStatus).indexOf(query.status as Types.LotStatus) !== -1
    ) {
      filters.status = query.status as Types.LotStatus;
    }

    await fetch();
  });

  return {
    key,
    rows,
    loading,
    columns,
    optionsStatus,
    filters,
    pagination,

    search,
    clearFilters,
    fetch,
    toggleLotIsTop,

    toDateFormat: useToDateFormat().toDateFormat,
  };
}
</script>
