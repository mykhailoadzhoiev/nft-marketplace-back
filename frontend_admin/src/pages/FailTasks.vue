<template>
  <q-page class="q-pa-md q-gutter-md">
    <q-table
      :key="key"
      class="q-mt-md"
      title="Fail Tasks"
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
          {{ props.row.id }}
        </q-td>
      </template>

      <template v-slot:body-cell-type="props">
        <q-td :key="'type'" :props="props">
          <q-item clickable>
            <q-item-section> Type </q-item-section>
            <q-item-section side>
              {{ props.row.type }}
            </q-item-section>
          </q-item>
          <q-input label="Data" type="textarea" readonly v-model="props.row.data" />
        </q-td>
      </template>

      <template v-slot:body-cell-errorText="props">
        <q-td :key="'errorText'" :props="props">
          <q-input type="textarea" readonly v-model="props.row.errorText" />
        </q-td>
      </template>

      <template v-slot:body-cell-failAt="props">
        <q-td :key="'failAt'" :props="props">
          {{ toDateFormat(props.row.failAt) }}
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :key="'actions'" :props="props">
          <q-btn round flat icon="construction" title="Recover" @click="taskRecover(props.row)" />
          <q-btn round flat color="negative" icon="delete" title="Delete" @click="taskDelete(props.row)" />
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
  name: 'PageFailTasks',

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

  const rows = ref([]) as Ref<unknown[]>;

  const loading = ref(false);

  const columns = [
    { name: 'id', label: 'ID', field: 'id', sortable: true },
    { name: 'type', label: 'Info', field: 'type', sortable: false },
    { name: 'failAt', label: 'Fail At', field: 'failAt', sortable: false },
    { name: 'errorText', label: 'Error', field: 'errorText', sortable: false },
    { name: 'actions', label: 'Actions' },
  ];

  const filters = reactive({});

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

    const fetchParams: AdminModeratorModel.ParamsGetFetchFailTasks = {
      page: props.pagination.page.toString(),
      pageSize: props.pagination.rowsPerPage.toString(),
      sortBy: props.pagination.sortBy as 'id',
      sortDesc: props.pagination.descending ? '1' : '0',
    };

    loading.value = true;

    try {
      const { data } = await AdminModeratorModel.getFetchFailTasks(fetchParams);

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

  async function taskRecover(task: Types.Task) {
    await AdminModerationModel.postTaskRecover(task.id);
    await fetch();
  }

  function taskDelete(task: Types.Task) {
    Dialog.create({
      title: 'Confirmation',
      color: 'negative',
      message: `Are you sure you should delete the failed task? (id:${task.id})`,
      ok: {
        label: 'Yes',
      },
      cancel: {
        label: 'Cancel',
      },
      prompt: {
        model: '',
        label: 'Enter "DELETE" for allow delete task',
        isValid: (val: string) => val === 'DELETE', // << here is the magic
        type: 'text',
      },
    }).onOk(async () => {
      await AdminModerationModel.deleteTask(task.id);
      await fetch();
      Notify.create({
        message: `Task ${task.id} deleted`,
        color: 'negative',
        position: 'top-right',
      });
    });
  }

  onMounted(async () => {
    useMeta({
      title: 'Fail Tasks',
    });

    const query = $route.query;

    pagination.value.page = typeof query.page === 'string' ? parseInt(query.page) : 1;
    pagination.value.rowsPerPage = typeof query.pageSize === 'string' ? parseInt(query.pageSize) : 20;
    pagination.value.sortBy = typeof query.sortBy === 'string' ? query.sortBy : null;
    pagination.value.descending = !(typeof query.sortType === 'string' && query.sortType === 'asc');

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
    taskRecover,
    taskDelete,

    toDateFormat: useToDateFormat().toDateFormat,
  };
}
</script>
