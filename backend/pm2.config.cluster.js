module.exports = {
  apps: [
    {
      name: 'app_server_master',
      cwd: __dirname,
      node_args : '--enable-source-maps -r dotenv/config',
      script: 'dist/app_server/index.js',
      env: {
        NODE_ROLE: 'MASTER',
        NODE_PORT: '3000',
        DIR_TEMP_FILES: './cluster/nodes/master/temp',
        HOT_CACHE_DIR: './cluster/nodes/master/ipfs_cache',
      },
    },
    {
      name: 'app_server_worker',
      cwd: __dirname,
      node_args : '--enable-source-maps -r dotenv/config',
      script: 'dist/app_server/index.js',
      increment_var: 'NODE_PORT',
      env: {
        NODE_ROLE: 'WORKER',
        NODE_PORT: '3001',
        DIR_TEMP_FILES: './cluster/nodes/worker_01/temp',
        HOT_CACHE_DIR: './cluster/nodes/worker_01/ipfs_cache',
      },
    },
    {
      name: 'app_daemon',
      cwd: __dirname,
      node_args : '--enable-source-maps -r dotenv/config',
      script: 'dist/app_daemon/index.js',
      increment_var: 'NODE_PORT',
      env: {
        DIR_TEMP_FILES: './cluster/nodes/daemon/temp',
        HOT_CACHE_DIR: './cluster/nodes/daemon/ipfs_cache',
      },
    },
  ],
};