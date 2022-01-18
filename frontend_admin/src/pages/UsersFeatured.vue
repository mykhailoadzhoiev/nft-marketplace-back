<template>
  <q-page class="q-pa-md q-gutter-md">
    <q-table
      :key="key"
      class="q-mt-md"
      title="Users"
      :rows="rows"
      :columns="columns"
      row-key="id"
    >
      <template v-slot:body-cell-id="props">
        <q-td :key="'id'" :props="props">
          <router-link :to="{ path: '/users/' + props.row.id }">{{
            props.row.id
          }}</router-link>
        </q-td>
      </template>

      <template v-slot:body-cell-avatar="props">
        <q-td :key="'avatar'" :props="props">
          <q-avatar>
            <img
              :src="
                props.row.avatar
                  ? '/sha256/' + props.row.avatar
                  : 'https://cdn.quasar.dev/img/boy-avatar.png'
              "
            />
          </q-avatar>
        </q-td>
      </template>

      <template v-slot:body-cell-metamaskAddress="props">
        <q-td :key="'metamaskAddress'" :props="props">
          <span v-if="props.row.metamaskAddress">
            <a
              :href="'https://bscscan.com/address/' + props.row.metamaskAddress"
              target="blank"
              >{{ props.row.metamaskAddress }}</a
            >
          </span>
          <span v-else> N/A </span>
        </q-td>
      </template>

      <template v-slot:body-cell-createdAt="props">
        <q-td :key="'createdAt'" :props="props">
          {{ toDateFormat(props.row.createdAt) }}
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
import { defineComponent, ref, Ref, onMounted } from 'vue';
import * as Types from '@/models/types';
import * as MarketUsersModel from '@/models/MarketUsers';
import { useToDateFormat } from '@/hooks/common';

export default defineComponent({
  name: 'PageUsersFeatured',

  props: {},

  setup() {
    const base = useBase();
    return {
      ...base,
    };
  },
});

function useBase() {
  const key = ref(Date.now());

  const rows = ref([]) as Ref<Types.UserView[]>;

  const loading = ref(false);

  const columns = [
    { name: 'id', label: 'ID', field: 'id', sortable: false },
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
      sortable: false,
    },
  ];

  onMounted(async () => {
    useMeta({
      title: 'Users Featured',
    });

    const { data } = await MarketUsersModel.getFeaturedUsers();
    rows.value = data;
  });

  return {
    key,
    rows,
    loading,
    columns,

    fetch,

    toDateFormat: useToDateFormat().toDateFormat,
  };
}
</script>
