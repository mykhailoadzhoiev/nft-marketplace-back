import Validator, { Checks } from './validator';

export async function paramsIdValidation(params: { [key: string]: string }) {
  const validationResult = await new Validator([
    {
      field: 'id',
      checks: [{ check: (val) => Checks.isStrInt(val), msg: 'fieldInvalid' }],
    },
  ])
    .setBody(params)
    .validation();

  return validationResult;
}
