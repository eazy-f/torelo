const path = require('path');
const webpack = require('webpack');

module.exports = {
    entry: {
        torelo: './src/torelo.js',
        popup: './src/popup.js'
    },
    output: {
        path: 'extension',
        filename: '[name].js',
    },
    module: {
        // This transpiles all code (except for third party modules) using Babel.
        loaders: [{
            exclude: /node_modules/,
            test: /\.js$/,
            // Babel options are in .babelrc
            loaders: ['babel'],
        }],
    },
    resolve: {
        // This allows you to import modules just like you would in a NodeJS app.
        extensions: ['', '.js', '.jsx'],
        root: [
            path.resolve(__dirname),
        ],
        modulesDirectories: [
            'src',
            'node_modules',
        ],
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production'),
        }),
    ]
};
