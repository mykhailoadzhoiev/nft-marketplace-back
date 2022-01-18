import { AxiosResponse } from 'axios';
import { ref } from 'vue';

export function createFormGenerator<T, R>(defaultModel: () => T, sumbmitBase: (model: T) => Promise<AxiosResponse<R>>) {
  return {
    generateForm() {
      return {
        model: defaultModel(),
        isBosy: ref(false),
        async submit() {
          this.isBosy.value = true;
          try {
            const res = await sumbmitBase(this.model);
            this.isBosy.value = false;
            return res;
          } catch (error: any) {
            this.isBosy.value = false;
            if (error.response.data.fields) {
              this.formErrorsFields.value = error.response.data.fields;
            }
            throw error;
          }
        },

        errorText: '',
        formErrorsFields: ref({} as { [field: string]: { errors: string[] } }),
        isError() {
          let errorsCount = 0;
          for (const field of Object.values(this.formErrorsFields.value.fields)) {
            errorsCount += field.length;
          }
          return errorsCount > 0;
        },
        hasFieldError(field: string) {
          if (
            this.formErrorsFields.value &&
            this.formErrorsFields.value[field] &&
            this.formErrorsFields.value[field].errors.length > 0
          ) {
            return true;
          } else {
            return false;
          }
        },
        getFieldErrors(field: string, onePerField?: boolean) {
          if (
            this.formErrorsFields.value &&
            this.formErrorsFields.value[field] &&
            this.formErrorsFields.value[field].errors.length > 0
          ) {
            if (onePerField) {
              return [this.formErrorsFields.value[field].errors[0]];
            } else {
              return this.formErrorsFields.value[field].errors;
            }
          } else {
            return [];
          }
        },
        clearErrors() {
          this.errorText = '';
          for (const key of Object.keys(this.formErrorsFields.value)) {
            delete this.formErrorsFields.value[key];
          }
        },
        reset() {
          const tempModel = defaultModel();
          for (const key in tempModel) {
            this.model[key] = tempModel[key];
          }
          this.clearErrors();
        },
      };
    },
  };
}
