import { ThrowExFields } from '@/lib_common/ex_errors';
import { Request, Response } from 'express';
import * as _ from 'lodash';
import validator from 'validator';
export { validator };
export * as Checks from './checks';

export interface ICheckParams {
  body?: any;
  req?: Request;
  validationResult?: ValidationResult;
  temp: { [key: string]: any };
}

interface IConditionParams {
  body?: any;
}

interface ICheck {
  (value: any, params?: ICheckParams): boolean | Promise<boolean>;
}

interface IValidationCheck {
  check: ICheck;
  msg: string;
  stopOnFail?: boolean;
  stopOnTrue?: boolean;
}

export interface IValidationRule {
  field: string;
  condition?(params: IConditionParams): boolean | Promise<boolean>;
  subRules?: IValidationRule[];
  each?(index: string): IValidationRule[];
  checks?: Array<IValidationCheck>;
}

interface IBody {
  [key: string]: any;
}

export class ValidationResult {
  public fields: { [field: string]: { errors: Array<string> } } = {};

  getTotalErrors() {
    let errorsTotal = 0;
    for (let field of Object.values(this.fields)) {
      errorsTotal += field.errors.length;
    }
    return errorsTotal;
  }

  initOrClearErrorField(field: string) {
    this.fields[field] = {
      errors: [],
    };
  }

  addErrorToField(field, errorMsg) {
    this.fields[field].errors.push(errorMsg);
  }

  isErrored() {
    return this.getTotalErrors() > 0;
  }

  throwEx(res: Response) {
    return ThrowExFields(res, this.fields);
  }
}

export default class Validator {
  private rules: IValidationRule[];
  private req: Request;
  private body: IBody;
  private validationResult: ValidationResult = new ValidationResult();
  private temp = {} as { [key: string]: any };

  constructor(rules: IValidationRule[]) {
    this.rules = rules;
  }

  public setRequest(req: Request) {
    this.req = req;

    if (!this.body) {
      if (this.req.method === 'GET') {
        this.body = this.req.query;
      } else {
        this.body = this.req.body;
      }
    }

    return this;
  }

  public setBody(body: IBody) {
    this.body = body;
    return this;
  }

  private async parseRules(validationResult: ValidationResult, rules: IValidationRule[], fildsFilter?: Array<string>) {
    if (!this.validationResult) {
      return;
    }

    let req = this.req;
    let body = this.body;

    for (let rule of rules) {
      let field = rule.field || '';
      let allowFlag = false;
      if (!fildsFilter) {
        allowFlag = true;
      } else {
        for (let filt of fildsFilter) {
          if (filt.endsWith('*') && field.startsWith(filt.replace('*', ''))) {
            allowFlag = true;
            break;
          } else if (filt === field) {
            allowFlag = true;
            break;
          }
        }
      }
      if (!allowFlag) {
        continue;
      }

      validationResult.initOrClearErrorField(field);
      if (typeof rule.condition === 'function' && !rule.condition({ body })) {
        continue;
      }

      let value = _.get(body, field);

      if (rule.subRules) {
        if (Array.isArray(rule.subRules)) {
          let subRules = rule.subRules;
          await this.parseRules(validationResult, subRules, fildsFilter);
        } else {
          validationResult.addErrorToField(field, 'badValidatorFormatField');
          continue;
        }
      } else if (typeof rule.each === 'function') {
        if (Array.isArray(value)) {
          for (let index in value) {
            let subRules = rule.each(index);
            await this.parseRules(validationResult, subRules, fildsFilter);
          }
        } else {
          validationResult.addErrorToField(field, 'badValidatorFormatField');
          continue;
        }
      } else if (rule.checks && Array.isArray(rule.checks)) {
        for (let check of rule.checks) {
          let checkResult: boolean = false;
          try {
            checkResult = await check.check(value, { body, req, validationResult, temp: this.temp });
          } catch (error) {
            console.error(error);
          }
          if (!checkResult) {
            validationResult.addErrorToField(field, check.msg || 'invalid');
            if (check.stopOnFail) {
              break;
            }
          } else {
            if (check.stopOnTrue) {
              break;
            }
          }
        }
      } else {
        validationResult.addErrorToField(field, 'badValidatorFormatField');
      }
    }
  }

  public async validation(fildsFilter?: Array<string>) {
    let validationResult = new ValidationResult();

    await this.parseRules(validationResult, this.rules, fildsFilter);

    for (let validationField of Object.keys(validationResult.fields)) {
      this.validationResult.fields[validationField] = validationResult.fields[validationField];
    }

    return validationResult;
  }

  public static singleExFields(res: Response, field: string, errorMsg: string) {
    let validationResult = new ValidationResult();
    validationResult.initOrClearErrorField(field);
    validationResult.addErrorToField(field, errorMsg || 'invalid');
    return ThrowExFields(res, validationResult.fields);
  }
}
