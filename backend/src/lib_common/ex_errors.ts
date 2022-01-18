import { Response as ExpressResponse } from 'express';

export enum ExType {
  // типы стандартных ошибок
  ExError = 'ex_error', // одинарная ошибка, с кодом внутри error
  ExFields = 'ex_fields', // ошибка формы, с fields внутри
  ExUnknown = 'ex_unknown', // не известная ошибка, error либо 'unknown', либо всё что угодно
}

export type Ex = {
  // Тело стандартной ошибки
  exType: ExType; // тип стандартной ошибки
  code: number; // код
  error: string; // текстовый код, для ExType.ExError
  fields?: { [field: string]: { errors: string[] } }; // поля с ошибками если типа форма
};

export type ArgExError = {
  code: number;
  error: string;
};

export function ThrowExError(res: ExpressResponse, exError: ArgExError) {
  return res.status(exError.code).json({
    exType: ExType.ExError,
    code: exError.code,
    error: exError.error,
  });
}

export function ThrowExFields(res: ExpressResponse, exFields: { [field: string]: { errors: string[] } }) {
  return res.status(422).json({
    exType: ExType.ExFields,
    code: 422,
    error: '',
    fields: exFields,
  });
}

export function ThrowExUnknown(res: ExpressResponse, code: number, someError = 'unknown' as any) {
  return res.status(code).json({
    type: ExType.ExUnknown,
    code: code,
    error: someError,
  });
}

export enum ExErrors {
  common_unauthorized = 'common.unauthorized',
  common_forbidden = 'common.forbidden',
  common_request_timeout = 'common.request_timeout',
  common_payload_too_large = 'common.payload_too_large',

  file_bad_mime_type = 'file.bad_mime_type',

  user_bad_passwort_reset_code = 'user.bad_passwort_reset_code',
  user_not_found = 'user.not_found',
  user_role_isnt_user = 'user.role_isnt_user',
  user_role_isnt_guest = 'user.role_isnt_guest',

  lot_not_found = 'lot.not_found',
  lot_isnt_sale_type = 'lot.isnt_sale_type',
  lot_isnt_auction_type = 'lot.isnt_auction_type',
  lot_isnt_sale_status = 'lot.isnt_sale_status',

  lot_token_not_found = 'lot_token.not_found',
  lot_token_not_available_for_buy = 'lot_token.not_available_for_buy',

  token_nft_not_found = 'token_nft.not_found',

  lot_bet_not_found = 'lot_bet.not_found',
  lot_bet_isnt_top_bet = 'lot_bet.isnt_top_bet',
  lot_bet_low_delay_before_bet_cancel = 'lot_bet.low_delay_before_bet_cancel',
  lot_bet_bet_user_is_equal_lot_user = 'lot_bet.bet_user_is_equal_lot_user',

  token_original_not_found = 'token_original.not_found',
  token_original_status_isnt_validation = 'token_original.status_isnt_validation',
  token_original_status_isnt_draft = 'token_original.status_isnt_draft',
  token_original_status_isnt_ban_or_draft = 'token_original.status_isnt_ban_or_draft',
  token_original_max_10_orgs_in_process = 'token_original.max_10_orgs_in_process',
  token_original_contents_not_load = 'token_original.contents_not_load',
  token_original_bad_file_content_type = 'token_original.bad_file_content_type',
  token_original_import_faild_load_meta_data = 'token_original.import_faild_load_meta_data',
  token_original_import_image_url_not_math = 'token_original.import_image_url_not_math',
  token_original_nft_isnt_approved = 'token_original.nft_isnt_approved',

  task_not_found = 'task.not_found',

  web3_smallBalance = 'web3.smallBalance',
  web3_smallApproval = 'web3.smallApproval',

  metamask_bad_message = 'metamask.bad_message',
  metamask_user_is_exist = 'metamask.user_is_exist',
}

export const ExErrorsTmp = {
  Common: {
    Unauthorized: {
      code: 401,
      error: ExErrors.common_unauthorized,
    },
    Forbidden: {
      code: 403,
      error: ExErrors.common_forbidden,
    },
    RequestTimeout: {
      code: 408,
      error: ExErrors.common_request_timeout,
    },
    PayloadTooLarge: {
      code: 413,
      error: ExErrors.common_payload_too_large,
    },
  },
  File: {
    BadMimeType: {
      code: 415,
      error: ExErrors.file_bad_mime_type,
    },
  },
  User: {
    BadPasswordResetCode: {
      code: 400,
      error: ExErrors.user_bad_passwort_reset_code,
    },
    NotFound: {
      code: 404,
      error: ExErrors.user_not_found,
    } as ArgExError,
    RoleIsntUser: {
      code: 412,
      error: ExErrors.user_role_isnt_user,
    },
    RoleIsntGuest: {
      code: 412,
      error: ExErrors.user_role_isnt_guest,
    },
  },
  Lot: {
    NotFound: {
      code: 404,
      error: ExErrors.lot_not_found,
    } as ArgExError,
    TypeIsntSale: {
      code: 412,
      error: ExErrors.lot_isnt_sale_type,
    },
    TypeIsntAuction: {
      code: 412,
      error: ExErrors.lot_isnt_auction_type,
    },
    StatusIsntSale: {
      code: 412,
      error: ExErrors.lot_isnt_sale_status,
    },
  },
  LotToken: {
    NotFound: {
      code: 404,
      error: ExErrors.lot_token_not_found,
    } as ArgExError,
    NotAvailableForBuy: {
      code: 412,
      error: ExErrors.lot_token_not_available_for_buy,
    },
  },
  TokenNft: {
    NotFound: {
      code: 404,
      error: ExErrors.token_nft_not_found,
    } as ArgExError,
  },
  LotBet: {
    NotFound: {
      code: 404,
      error: ExErrors.lot_bet_not_found,
    } as ArgExError,
    IsntTopBet: {
      code: 412,
      error: ExErrors.lot_bet_isnt_top_bet,
    },
    LowDelayBeforeBetCancel: {
      code: 412,
      error: ExErrors.lot_bet_low_delay_before_bet_cancel,
    },
    BetUserIsEqualLotUser: {
      code: 412,
      error: ExErrors.lot_bet_bet_user_is_equal_lot_user,
    },
  },
  TokenOriginal: {
    NotFound: {
      code: 404,
      error: ExErrors.token_original_not_found,
    } as ArgExError,
    StatusIsntValidation: {
      code: 412,
      error: ExErrors.token_original_status_isnt_validation,
    },
    StatusIsntDraft: {
      code: 412,
      error: ExErrors.token_original_status_isnt_draft,
    },
    StatusIsntBanOrDraft: {
      code: 412,
      error: ExErrors.token_original_status_isnt_ban_or_draft,
    },
    Max10OrgsInProcess: {
      code: 412,
      error: ExErrors.token_original_max_10_orgs_in_process,
    },
    ContentsNotLoad: {
      code: 412,
      error: ExErrors.token_original_contents_not_load,
    } as ArgExError,
    BadFileContentType: {
      code: 412,
      error: ExErrors.token_original_bad_file_content_type,
    },
    ImportFaildLoadMetaData: {
      code: 412,
      error: ExErrors.token_original_import_faild_load_meta_data,
    },
    ImportImageUrlNotMath: {
      code: 412,
      error: ExErrors.token_original_import_image_url_not_math,
    },
    ImportNftIsntApproved: {
      code: 412,
      error: ExErrors.token_original_nft_isnt_approved,
    },
  },
  Task: {
    NotFound: {
      code: 404,
      error: ExErrors.task_not_found,
    } as ArgExError,
  },
  Web3: {
    SmallBalance: {
      code: 412,
      error: ExErrors.web3_smallBalance,
    },
    SmallApproval: {
      code: 412,
      error: ExErrors.web3_smallApproval,
    },
  },
  Metamask: {
    BadMessage: {
      code: 412,
      error: ExErrors.metamask_bad_message,
    },
    UserIsExist: {
      code: 418,
      error: ExErrors.metamask_user_is_exist,
    },
  },
};
