// webpack.config.js
import path from 'path';
import { fileURLToPath } from 'url';

import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyPlugin from 'copy-webpack-plugin';
import { VueLoaderPlugin } from 'vue-loader';
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin';
import webpack from 'webpack';
import util from 'util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = {
    mode: 'development',
    devtool: 'inline-source-map',
    entry: {
        background: ['./src/serviceworkers/background.js', './src/serviceworkers/semantic.js'],
        popup: './src/popup/popup.js',
        content: './src/content/content.js',
        options: './src/options/options.js'
    },
    resolve: {
        fallback: {
            "fs": false,
            "tls": false,
            "net": false,
            "path": false,
            "util": false,
        }
    },
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: '[name].js',
    },
    module: {
        rules: [
            {
                test: /\.vue$/,
                use: 'vue-loader'
            },
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader',
                ],
            },
        ],
    },
    plugins: [
        new NodePolyfillPlugin(),
        new webpack.DefinePlugin({
            __VUE_OPTIONS_API__: true,
            __VUE_PROD_DEVTOOLS__: false,
        }),
        new VueLoaderPlugin(),
        new HtmlWebpackPlugin({
            template: './src/popup/popup.html',
            filename: 'popup.html',
        }),
        new HtmlWebpackPlugin({
            template: './src/options/options.html',
            filename: 'options.html',
        }),
        new CopyPlugin({
            patterns: [
                {
                    from: "public",
                    to: "." // Copies to build folder
                },
                {
                    from: "src/popup/popup.css",
                    to: "popup.css"
                },
                {
                    from: "src/content/content.css",
                    to: "content.css"
                },
                {
                    from: "src/serviceworkers/pdf.js",
                    to: "pdf.js"
                },
                {
                    from: "src/serviceworkers/pdf.worker.js",
                    to: "pdf.worker.js"
                },
                {
                    from: "src/options/options.css",
                    to: "options.css"
                },
            ],
        })
    ],
};

export default config;


