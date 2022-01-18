const path = require('path');
const nodeExternals = require('webpack-node-externals');

const {
  NODE_ENV = 'development',
} = process.env;

module.exports = {
  mode: NODE_ENV,
  watch: NODE_ENV === 'development',
  target: 'node',
  externals: [ nodeExternals() ],
  entry: {
    'app_server/index': './src/app_server/main.ts',
    'app_daemon/index': './src/app_daemon/main.ts'
  },
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  resolve: {
    roots: [__dirname],
    extensions: ['.ts', '.js'],
    alias: {
      "@": path.resolve(__dirname, 'src/'),
      "src": path.resolve(__dirname, 'src/'),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          'ts-loader',
        ]
      }
    ]
  }
}
