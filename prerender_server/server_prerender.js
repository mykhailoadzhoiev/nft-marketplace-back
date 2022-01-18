import env from './env.js';
import prerender from 'prerender';
import cacheManager from 'cache-manager';
import fsStore from 'cache-manager-fs';
import * as fs from 'fs-extra';
import dayjs from 'dayjs';

const prerenderServerParams = {
    port: env.PRERENDER_PORT,
    chromeLocation: env.PRERENDER_CHROME_LOCATION,
    chromeFlags: ['--no-sandbox', '--headless', '--disable-gpu', '--remote-debugging-port=9222', '--hide-scrollbars'],
    waitAfterLastRequest: env.PRERENDER_WAIT_AFTER_LAST_REQUEST
};

process.env.DISABLE_LOGGING = true;

function logger () {
    if (env.PRERENDER_LOGGER_IS_DISABLED) {
        return;
    }
    console.log.apply(null, arguments);
}

const cachePlugen = {
    init: async function () {
        if (!(await fs.pathExists(env.PRERENDER_CACHE_FILE_LOCATION))) {
            await fs.mkdirs(env.PRERENDER_CACHE_FILE_LOCATION);
        } else {
            await fs.remove(env.PRERENDER_CACHE_FILE_LOCATION);
        }

        this.memCache = cacheManager.caching({
            store: 'memory',
            max: env.PRERENDER_CACHE_MEM_MAX_ITEMS,
            ttl: env.PRERENDER_CACHE_MEM_TTL_SEC
        });

        this.fsCache = cacheManager.caching({
            store: fsStore,
            max: env.PRERENDER_CACHE_FILE_MAX_SIZE,
            maxSize: env.PRERENDER_CACHE_FILE_MAX_SIZE,
            path: env.PRERENDER_CACHE_FILE_LOCATION
        });
    },
    requestReceived: async function (req, res, next) {
        try {
            let result;
            let cacheType = 'mem';

            result = await this.memCache.get(req.prerender.url);

            if (!result) {
                result = await this.fsCache.get(req.prerender.url);
                cacheType = 'fs';
            }

            req.requestStart = Date.now();

            if (result) {

                if (cacheType === 'fs') {
                    await this.memCache.set(req.prerender.url, result);
                }

                req.prerender.cacheType = cacheType;
                res.send(200, result);

            } else {

                next();

            }

        } catch (e) {
            next();
        }
    },
    pageLoaded(req, res, next) {
        next();
    },
    beforeSend: async function (req, res, next) {
        if (req.prerender.statusCode == 200) {
            req.requestTime = Date.now() - req.requestStart;

            logger(dayjs().format('YYYY-MM-DD HH:mm:ss') + ':', req.prerender.url, req.headers['user-agent']);

            if (req.prerender.cacheType) {
                logger('TYPE: ' + req.prerender.cacheType + ' cache, TIME: ' + req.requestTime + ' ms');
            } else {
                logger('TYPE: render, TIME: ' + req.requestTime + ' ms');
            }
        }

        if (!req.prerender.cacheType && req.prerender.statusCode == 200) {
            await this.memCache.set(req.prerender.url, req.prerender.content);
            await this.fsCache.set(req.prerender.url, req.prerender.content);
        }
        next();
    }
};

const server = prerender(prerenderServerParams);
server.use(cachePlugen);

server.start();
