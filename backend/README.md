# Description

Project Template (Backend)
Backend technologies:

- nodejs
- typescript
- Prisma (ORM)
- Custom Libs

# deploy single process

```sh
cd <project_root>

mkdir data
yarn
yarn global add pm2
pm2 install typescript
cp .env.default .env
cp ./pm2.config.single.js ./pm2.config.js
docker-compose up -d
npx prisma migrate dev
yarn seeder
pm2 start pm2.config.js
```

# deploy cluster

```sh
cd <project_root>

mkdir data
yarn
yarn global add pm2
pm2 install typescript
cp .env.default .env
cp -r ./cluster_default ./cluster
cp ./pm2.config.cluster.js ./pm2.config.js
docker-compose up -d
npx prisma migrate dev
yarn seeder
nano pm2.config.js        # view[, edit[, save]] close
nano ./cluster/traefik.ts # view[, edit[, save]] close
yarn traefik_generate
pm2 start pm2.config.js
traefik --configFile=./cluster/traefik/traefik.yml
```

# start backend for dev

```sh
cd <project_root>
docker-compose up -d
yarn server
```

# start cluster for dev

```sh
cd <project_root>
docker-compose up -d
pm2 start pm2.config.js
traefik --configFile=./cluster/traefik/traefik.yml
```

# docker compose

```sh
# default version
docker-compose up -d
docker-compose down
```

# recreate postgres public schema, only for dev

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
COMMENT ON SCHEMA public IS 'standard public schema';
```

# prisma orm commands

## create migration only

```sh
npx prisma migrate dev --name <name> --create-only
```

## apply not used migrations

```sh
npx prisma migrate dev
```

## create and apply migration (!!!)

```sh
npx prisma migrate dev --name <name>
```

## prisma generate (update types)

```sh
npx prisma generate
```

## prisma reset (ONLY FOR DEV!!!(!!!)) (drop and recreate db from migrations)

```sh
npx prisma migrate reset
```

## migrations docs

https://www.prisma.io/docs/concepts/components/prisma-migrate
https://www.prisma.io/docs/guides/application-lifecycle/developing-with-prisma-migrate/advanced-migrate-scenarios

# db seeds

```sh
npx ts-node -r tsconfig-paths/register cmd.ts db/seeds/0001_CreateAdmin.ts
```

# for pm2

```env
pm2 start server.ts --node-args="-r tsconfig-paths/register"
```

# test cmds...

```sh
npx ts-node -r tsconfig-paths/register cmd.ts test/prisma_some_where <userId>
```

# web3 utils commands:

```sh
# tests
npx ts-node -r tsconfig-paths/register cmd.ts web3/test_wbnb_transfer_from
npx ts-node -r tsconfig-paths/register cmd.ts test/ipfs_ranges
# fix lots last active
npx ts-node -r tsconfig-paths/register cmd.ts db/lots_last_active_from_history.ts
# generate traefik config
npx ts-node -r tsconfig-paths/register cmd.ts traefik/config_generator
```
