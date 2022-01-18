import { date } from 'quasar';

export function useToDateFormat() {
  function toDateFormat(value: Date | string, format?: string) {
    return date.formatDate(value, format || 'YYYY-MM-DD HH:mm:ss');
  }
  return { toDateFormat };
}
