import * as dotenv from 'dotenv';
dotenv.config();

const env = process.env;

function toString (envParam, defaultValue) {
  return envParam ? envParam : defaultValue;
}

function toInt (envParam, defaultValue) {
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

function toBool (envParam, defaultValue) {
  if (envParam === '0' || envParam === 'false') {
    return false;
  } else if (envParam === '1' || envParam === 'true') {
    return true;
  } else {
    return defaultValue;
  }
}

export default {
    PRERENDER_LOGGER_IS_DISABLED: toBool(env.PRERENDER_LOGGER_IS_DISABLED, false),
    PRERENDER_PORT: toInt(env.PRERENDER_PORT, 3400),
    PRERENDER_CHROME_LOCATION: toString(env.PRERENDER_CHROME_LOCATION, null),
    PRERENDER_WAIT_AFTER_LAST_REQUEST: toInt(env.PRERENDER_WAIT_AFTER_LAST_REQUEST, 1800),

    PRERENDER_CACHE_MEM_MAX_ITEMS: toInt(env.PRERENDER_CACHE_MEM_MAX_ITEMS, 1000),
    PRERENDER_CACHE_MEM_TTL_SEC: toInt(env.PRERENDER_CACHE_MEM_TTL_SEC, 60 * 60 * 24), // seconds

    PRERENDER_CACHE_FILE_MAX_ITEMS: toInt(env.PRERENDER_CACHE_FILE_MAX_ITEMS, 5000),
    PRERENDER_CACHE_FILE_MAX_SIZE: toInt(env.PRERENDER_CACHE_FILE_MAX_SIZE, 1024 * 1024 * 1024), // 1024 mb
    PRERENDER_CACHE_FILE_LOCATION: toString(env.PRERENDER_CACHE_FILE_LOCATION, 'temp/prerender_cache')
}