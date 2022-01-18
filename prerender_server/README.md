# install and use
```sh
# install modules
npm i
# copy and edit envs
cp .env.default .env
nano .env # view, [edit,] [save]
# start
npm run start
```

# configure nginx for prerender server
```
upstream prerender_server {
    server 127.0.0.1:3400;
    keepalive 8;
}

upstream traefik_app {
    server 127.0.0.1:4000;
    ip_hash;
}

server {
    listen 80;
    server_name example.com;

    location / {        
        set $prerender 0;
        if ($http_user_agent ~* "googlebot|bingbot|yandex|baiduspider|twitterbot|telegrambot|facebookexternalhit|rogerbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|pinterest\/0\.|pinterestbot|slackbot|vkShare|W3C_Validator|whatsapp") {
            set $prerender 1;
        }
        if ($args ~ "_escaped_fragment_") {
            set $prerender 1;
        }
        if ($http_user_agent ~ "Prerender") {
            set $prerender 0;
        }
        if ($uri ~* "\.(js|css|xml|less|png|jpg|jpeg|gif|pdf|doc|txt|ico|rss|zip|mp3|rar|exe|wmv|doc|avi|ppt|mpg|mpeg|tif|wav|mov|psd|ai|xls|mp4|m4a|swf|dat|dmg|iso|flv|m4v|torrent|ttf|woff|svg|eot)") {
            set $prerender 0;
        }
        if ($uri ~ "^/(sha256|api).*$") {
            set $prerender 0;
        }

        if ($prerender = 1) {
            rewrite .* /render?url=$scheme://$host$request_uri break;
            proxy_pass http://prerender_server;

        }

        include    nginxconfig.io/proxy.conf;
        proxy_pass http://traefik_app;
    }
}
```