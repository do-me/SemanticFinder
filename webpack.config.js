const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin'); // FOUC-correction
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin'); 

module.exports = {
  entry: './src/js/index.js',
  mode: 'development',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],

      },
      {
        test: /\.svg$/,
        type: 'asset/resource',
        generator: {
          filename: '[name][ext]'
        }
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html',
    }),
    new MiniCssExtractPlugin(),
    new FaviconsWebpackPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/models/**/*_sizes.json', // Source directory of JSON files
          to: 'models/[name][ext]'
        },
      ],
    }),
  ],
};
