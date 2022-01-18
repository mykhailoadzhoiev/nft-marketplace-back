git checkout ..
git pull
yarn
sh build_frontend_admin.sh
sh build_frontend_main.sh
npx prisma generate
yarn build
pm2 stop all
yarn migrate_prod
pm2 restart all