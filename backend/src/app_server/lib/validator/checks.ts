import * as moment from 'moment';
import validator from 'validator';
import env from '@/lib_common/env';
import axios, { AxiosResponse } from 'axios';
import { Request } from 'express';

export function isSet(val: any) {
  return typeof val !== 'undefined';
}

export function isIntNumber(
  val,
  options?: {
    min?: number;
    max?: number;
  },
) {
  if (typeof val === 'number' && !Number.isInteger(val)) {
    return false;
  }

  if (options) {
    if (typeof options.min === 'number' && val < options.min) {
      return false;
    }
    if (typeof options.max === 'number' && val > options.max) {
      return false;
    }
  }

  return true;
}

export function isString(val: any) {
  if (typeof val === 'string') {
    return true;
  }
  return false;
}

export function isArray(
  val: any,
  options?: {
    minLen?: number;
    maxLen?: number;
  },
) {
  if (!val || !Array.isArray(val)) {
    return false;
  }
  if (options) {
    if (typeof options.minLen === 'number') {
      if (val.length < options.minLen) {
        return false;
      }
    }
    if (typeof options.maxLen === 'number') {
      if (val.length > options.maxLen) {
        return false;
      }
    }
  }
  return true;
}

export function isUndOrString(
  val: any,
  options?: {
    minLen?: number;
    maxLen?: number;
    regex?: RegExp;
  },
) {
  if (typeof val === 'undefined') {
    return true;
  }
  if (typeof val === 'string') {
    if (!val) {
      return true;
    }
    if (options) {
      if (typeof options.minLen === 'number' && val.length < options.minLen) {
        return false;
      }
      if (typeof options.maxLen === 'number' && val.length > options.maxLen) {
        return false;
      }
      if (options.regex && !options.regex.test(val)) {
        return false;
      }
    }
    return true;
  }
  return false;
}

export function isStrInt(val: any) {
  return typeof val === 'string' && validator.isInt(val);
}

export function isUndOrIsStrInt(val: any) {
  return typeof val === 'undefined' || (typeof val === 'string' && validator.isInt(val));
}

export function isInVals(val: any, vals: Array<any>) {
  return vals.indexOf(val) !== -1;
}

export function isUndOrValsCollection(val, delimiter: string, allowVals: string[]) {
  if (typeof val === 'undefined') {
    return true;
  }

  if (typeof val !== 'string') {
    return false;
  }

  const vals = val.split(delimiter);
  for (const val of vals) {
    for (const allowVal of allowVals) {
      if (val !== allowVal) {
        return true;
      }
    }
  }

  return true;
}

export function isUndOrInVals(val: any, vals: Array<any>) {
  if (typeof val === 'undefined') {
    return true;
  }
  return vals.indexOf(val) !== -1;
}

export function isBool(val: any) {
  return typeof val === 'boolean';
}

export function isUndOrBool(val: any) {
  return typeof val === 'undefined' || typeof val === 'boolean';
}

export function isNullOrDateTime(
  val: any,
  params?: {
    offsetForMin?: {
      num: number;
      unit: moment.unitOfTime.DurationConstructor;
    };
    offsetForMax?: {
      num: number;
      unit: moment.unitOfTime.DurationConstructor;
    };
  },
) {
  if (val === null) {
    return true;
  }

  return isDate(val, params);
}

export function isUndOrDateTime(
  val: any,
  params?: {
    offsetForMin?: {
      num: number;
      unit: moment.unitOfTime.DurationConstructor;
    };
    offsetForMax?: {
      num: number;
      unit: moment.unitOfTime.DurationConstructor;
    };
  },
) {
  if (typeof val === 'undefined') {
    return true;
  }

  return isDate(val, params);
}

export function isDate(
  val: string,
  params?: {
    offsetForMin?: {
      num: number;
      unit: moment.unitOfTime.DurationConstructor;
    };
    offsetForMax?: {
      num: number;
      unit: moment.unitOfTime.DurationConstructor;
    };
  },
) {
  const momentDate = moment(val);
  let isValid = momentDate.isValid();
  if (!isValid) {
    return false;
  }
  if (params) {
    if (params.offsetForMin) {
      let minDate = moment().add(params.offsetForMin.num, params.offsetForMin.unit).toDate();
      if (momentDate.toDate() < minDate) {
        return false;
      }
    }
    if (params.offsetForMax) {
      let maxDate = moment().add(params.offsetForMax.num, params.offsetForMax.unit).toDate();
      if (momentDate.toDate() > maxDate) {
        return false;
      }
    }
  }
  return true;
}

export function isAdultManBirtchDateFormat(val: string, dateFormat: string) {
  return this.isDate(val, dateFormat, {
    offsetForMax: { num: -18, unit: 'years' },
  });
}

export function isOldTsYearIssued(val: any) {
  return validator.isInt(val, { min: 1970, max: new Date().getFullYear() - 5 });
}

export async function isValidGoogleRecaptcha(val, req: Request) {
  var recaptcha_url = 'https://www.google.com/recaptcha/api/siteverify?';
  recaptcha_url += 'secret=' + env.GOOGLE_RECAPTCHA + '&';
  recaptcha_url += 'response=' + val + '&';
  recaptcha_url += 'remoteip=' + req.socket.remoteAddress;

  try {
    const res = (await axios.get(recaptcha_url)) as AxiosResponse<{ success: boolean }>;
    return res.data.success;
  } catch (error) {
    return false;
  }
}
