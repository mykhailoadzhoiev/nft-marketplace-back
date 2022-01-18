#!/usr/bin

timestamp=$(date +%s)
front_app_name=admin
new_dir_name=${front_app_name}_new_${timestamp}
old_dir_name=${front_app_name}_old_${timestamp}

mkdir -p ./data
mkdir -p ./data/frontends

cd ../frontend_admin
{
  git pull
  npm install
  npm run build
} || {
  echo 'error exit'
  exit 1
}

cp -r ./dist/spa ../backend/data/frontends/${new_dir_name}
cd ../backend/data/frontends/
mv ./${front_app_name} ./${old_dir_name}
mv ./${new_dir_name} ./${front_app_name}
rm -rf ./${old_dir_name}

cd ../../
exit 0