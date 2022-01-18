module.exports = {
  apps: [
    {
      name: 'app_master',
      cwd: __dirname,
      node_args : '-r dotenv/config',
      script: 'dist/app_server/index.js',
      env: {
        NODE_ROLE: 'MASTER',
        NODE_PORT: '3000',
        DIR_TEMP_FILES: './data/temp',
        HOT_CACHE_DIR: './data/ipfs_cache',
      },
    },
  ],
};
