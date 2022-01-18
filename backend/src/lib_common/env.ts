import * as path from 'path';
import * as _ from 'lodash';
import { MediaType } from '.prisma/client';

export enum NodeEnvType {
  development = 'development',
  production = 'production',
}

export enum NodeRoleType {
  MASTER = 'MASTER',
  WORKER = 'WORKER',
}

export enum SendEmailType {
  sync = 'sync',
  task = 'task',
}

const env = process.env;

export default {
  NODE_ENV: toEnum(env.NODE_ENV, Object.values(NodeEnvType), NodeEnvType.production) as NodeEnvType,
  // NODE_ENV: NodeEnvType.production as NodeEnvType,
  NODE_ROLE: toEnum(env.NODE_ROLE, Object.values(NodeRoleType), NodeRoleType.MASTER) as NodeRoleType,
  NODE_PORT: toInt(env.NODE_PORT, 3000),
  NODE_HOST: toString(env.NODE_HOST, 'localhost'),
  NODE_PROTOCOL: toString(env.NODE_PROTOCOL, 'http:'),

  PASSWORD_SALT: toString(env.PASSWORD_SALT, 'passwordSalt'),

  JWT_SECRET: toString(env.JWT_SECRET, 'jwtSecret'),

  DATABASE_URL: toString(env.DATABASE_URL, 'postgresql://postgres:postgres@localhost:5432/postgres?schema=public'),

  SYS_PANCAKESWAP_TOKEN: toString(env.SYS_PANCAKESWAP, '0xdB238123939637D65a03E4b2b485650B4f9D91CB'),

  DIR_TEMP_FILES: toPath(env.DIR_TEMP_FILES, './data/temp'),
  DIR_FRONT_APP_MAIN: toPath(env.DIR_FRONT_APP_MAIN, './data/frontends/main'),
  DIR_FRONT_APP_ADMIN: toPath(env.DIR_FRONT_APP_ADMIN, './data/frontends/admin'),

  GOOGLE_RECAPTCHA: toString(env.GOOGLE_RECAPTCHA, 'xxxxxxxxxxxxxxxxxxxx'),

  REDIS_HOST: toString(env.REDIS_HOST, 'localhost'),
  REDIS_PORT: toInt(env.REDIS_PORT, 6379),
  REDIS_DB: toInt(env.REDIS_DB, 0),

  MAILER_SEND_EMAIL_TYPE: toEnum(
    env.MAILER_SEND_EMAIL_TYPE,
    Object.values(SendEmailType),
    SendEmailType.sync,
  ) as SendEmailType,
  MAILER_QUEUE_DELAY_SEC: toInt(env.MAILER_QUEUE_DELAY_SEC, 20),
  MAILER_DEFAULT_FROM_EMAIL: toString(env.MAILER_DEFAULT_FROM_EMAIL, 'noreply@example.com'),
  MAILER_DEFAULT_FROM_NAME: toString(env.MAILER_DEFAULT_FROM_NAME, 'Project Name'),
  MAILER_SMTP_HOST: toString(env.MAILER_SMTP_HOST, 'smtp.example.com'),
  MAILER_SMTP_PORT: toInt(env.MAILER_SMTP_PORT, 587),
  MAILER_SMTP_IS_SECURE: toBool(env.MAILER_SMTP_IS_SECURE, true),
  MAILER_SMTP_AUTH_USER: toString(env.MAILER_SMTP_AUTH_USER, 'noreply@example.com'),
  MAILER_SMTP_AUTH_PASS: toString(env.MAILER_SMTP_AUTH_PASS, 'password'),

  LOT_MAKE_BASE_MAX_SIZE: toInt(env.LOT_MAKE_BASE_MAX_SIZE, 1024 * 1024 * 100), // 100 mb
  // Image
  LOT_MAKE_IMAGE_MAX_SIZE: toInt(env.LOT_MAKE_IMAGE_MAX_SIZE, 1024 * 1024 * 100), // 100 mb
  LOT_MAKE_IMAGE_ALLOW_MIME_TYPES: toArrayStrings(env.LOT_MAKE_IMAGE_ALLOW_MIME_TYPES, ',', [
    'image/jpeg',
    'image/png',
    'image/webp',
  ]),
  LOT_MAKE_IMAGE_MIN_WIDTH: toInt(env.LOT_MAKE_IMAGE_MIN_WIDTH, 200),
  LOT_MAKE_IMAGE_MIN_HEIGHT: toInt(env.LOT_MAKE_IMAGE_MIN_HEIGHT, 200),
  // Video
  LOT_MAKE_VIDEO_MAX_SIZE: toInt(env.LOT_MAKE_VIDEO_MAX_SIZE, 1024 * 1024 * 100), // 100 mb
  LOT_MAKE_VIDEO_ALLOW_MIME_TYPES: toArrayStrings(env.LOT_MAKE_VIDEO_ALLOW_MIME_TYPES, ',', ['video/mp4']),
  LOT_MAKE_VIDEO_MIN_WIDTH: toInt(env.LOT_MAKE_VIDEO_MIN_WIDTH, 200),
  LOT_MAKE_VIDEO_MIN_HEIGHT: toInt(env.LOT_MAKE_VIDEO_MIN_HEIGHT, 200),
  LOT_MAKE_VIDEO_MAX_DURATION_SEC: toInt(env.LOT_MAKE_VIDEO_MAX_DURATION_SEC, 180), // seconds
  LOT_MAKE_VIDEO_MIN_FRAME_RATE: toInt(env.LOT_MAKE_VIDEO_MIN_FRAME_RATE, 23), // seconds
  // Audio
  LOT_MAKE_AUDIO_MAX_SIZE: toInt(env.LOT_MAKE_AUDIO_MAX_SIZE, 1024 * 1024 * 100), // 100 mb
  LOT_MAKE_AUDIO_ALLOW_MIME_TYPES: toArrayStrings(env.LOT_MAKE_AUDIO_ALLOW_MIME_TYPES, ',', [
    'audio/aac',
    'audio/mpeg',
    'audio/wav',
  ]),
  LOT_MAKE_AUDIO_MAX_DURATION_SEC: toInt(env.LOT_MAKE_MAX_AUDIO_DURATION_SEC, 180), // seconds

  getLotContentMaxSize(mediaType: MediaType) {
    if (mediaType === MediaType.IMAGE) {
      return this.LOT_MAKE_IMAGE_MAX_SIZE;
    } else if (mediaType === MediaType.VIDEO) {
      return this.LOT_MAKE_VIDEO_MAX_SIZE;
    } else if (mediaType === MediaType.AUDIO) {
      return this.LOT_MAKE_AUDIO_MAX_SIZE;
    }
  },

  getLotContentMimeType(mediaType: MediaType) {
    if (mediaType === MediaType.IMAGE) {
      return this.LOT_MAKE_IMAGE_ALLOW_MIME_TYPES;
    } else if (mediaType === MediaType.VIDEO) {
      return this.LOT_MAKE_VIDEO_ALLOW_MIME_TYPES;
    } else if (mediaType === MediaType.AUDIO) {
      return this.LOT_MAKE_AUDIO_ALLOW_MIME_TYPES;
    }
  },

  getLotContentMinWidth(mediaType: MediaType) {
    if (mediaType === MediaType.IMAGE) {
      return this.LOT_MAKE_IMAGE_MIN_WIDTH;
    } else if (mediaType === MediaType.VIDEO) {
      return this.LOT_MAKE_VIDEO_MIN_WIDTH;
    }
  },

  getLotContentMinHeight(mediaType: MediaType) {
    if (mediaType === MediaType.IMAGE) {
      return this.LOT_MAKE_IMAGE_MIN_HEIGHT;
    } else if (mediaType === MediaType.VIDEO) {
      return this.LOT_MAKE_VIDEO_MIN_HEIGHT;
    }
  },

  AWS_S3_IS_LOCAL: toBool(env.AWS_S3_IS_LOCAL, true),
  AWS_S3_ACCESS_KEY: toString(env.AWS_S3_ACCESS_KEY, 'S3_ACCESS_KEY'),
  AWS_S3_SECRET_KEY: toString(env.AWS_S3_SECRET_KEY, 'S3_SECRET_KEY'),
  AWS_S3_ENDPOINT: toString(env.AWS_S3_ENDPOINT, 'http://127.0.0.1:9000'),
  AWS_S3_IPFS_BUCKET: toString(env.AWS_S3_IPFS_BUCKET, 'ipfs'),

  METAMASK_MESSAGE_BASE: toString(env.METAMASK_MESSAGE_BASE, 'Test text for metamask login:'),
  METAMASK_MESSAGE_TTL: toInt(env.METAMASK_MESSAGE_TTL, 120),
  METAMASK_PROVIDER_URL: toString(env.METAMASK_PROVIDER_URL, 'https://data-seed-prebsc-2-s2.binance.org:8545/'),
  METAMASK_PRIVATE_KEY: toString(
    env.METAMASK_PRIVATE_KEY,
    '3b8b5c7574bfd66a16cabe83cba938f92039872a5f3bd8049ecae9cd2762b07b',
  ),

  HOT_CACHE_DIR: toPath(env.HOT_CACHE_DIR, './data/ipfs_cache'),
  HOT_CACHE_DIR_SUFFIX_LENGTH: toInt(env.HOT_CACHE_DIR_SUFFIX_LENGTH, 2),
  HOT_CACHE_MIN_THUMB_LOG_SIZE: toInt(env.HOT_CACHE_MIN_THUMB_LOG_SIZE, 5),
  HOT_CACHE_MAX_ITEMS: toInt(env.HOT_CACHE_MAX_ITEMS, 1000),
  HOT_CACHE_MAX_SIZE: toInt(env.HOT_CACHE_MAX_SIZE, 1024 * 1024 * 2048), // 2048 mb

  UPLOAD_AVATAR_LIMIT_MB: toInt(env.UPLOAD_AVATAR_LIMIT_MB, 15),
  UPLOAD_BACKGROUND_LIMIT_MB: toInt(env.UPLOAD_BACKGROUND_LIMIT_MB, 15),
};

function toString(envParam: string, defaultValue: string) {
  return envParam ? envParam : defaultValue;
}

function toInt(envParam: string, defaultValue: number) {
  if (envParam) {
    const tmp = parseInt(envParam);
    if (Number.isInteger(tmp)) {
      return tmp;
    } else {
      return defaultValue;
    }
  } else {
    return defaultValue;
  }
}

function toBool(envParam: string, defaultValue: boolean) {
  if (envParam === '0' || envParam === 'false') {
    return false;
  } else if (envParam === '1' || envParam === 'true') {
    return true;
  } else {
    return defaultValue;
  }
}

function toEnum(envParam: string, enumValues: string[], defaultValue: string) {
  return enumValues.indexOf(envParam) >= 0 ? envParam : defaultValue;
}

function toArrayStrings(envParam: string, spliter: string, defaultValue: string[]) {
  if (envParam) {
    try {
      const values = envParam.split(spliter);
      return values;
    } catch (error) {}
  }
  return defaultValue;
}

function _parsePath(pathParam: string) {
  if (_.startsWith(pathParam, './') || _.startsWith(pathParam, '../')) {
    return path.resolve(process.cwd(), pathParam);
  } else if (_.startsWith(pathParam, '/')) {
    return pathParam;
  } else {
    return null;
  }
}
function toPath(envParam: string, defaultPathValue) {
  if (envParam) {
    const tmp = _parsePath(envParam);
    if (tmp) {
      return tmp;
    } else {
      return _parsePath(defaultPathValue);
    }
  } else {
    return _parsePath(defaultPathValue);
  }
}
