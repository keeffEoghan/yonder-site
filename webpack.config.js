const webpack = require('webpack');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';
const modulesDirectories = [path.resolve(__dirname, 'node_modules')];

const config = {
    entry: ['./scripts/site.js'],
    output: {
        path: path.resolve(__dirname, 'build', 'scripts'),
        filename: 'site-bundle.js'
    },
    devtool: ((isProduction)? false : 'source-map'),
    module: {
        loaders: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader'
            },
            {
                test: /\?(.+\&)?yr-babel(\&.+)?$/,
                loader: 'babel-loader'
            },
            {
                test: require.resolve('zepto'),
                loader: 'imports-loader?this=>window'
            },
            {
                test: require.resolve('svg.pathmorphing2.js'),
                loader: 'imports-loader?SVG=svg.js'
            }
        ]
    },
    plugins: [
        new webpack.optimize.DedupePlugin(),
        new webpack.optimize.OccurenceOrderPlugin(),

        new webpack.DefinePlugin({
            '__DEBUG__': JSON.stringify(!isProduction)
        }),

        new webpack.optimize.UglifyJsPlugin({
            beautify: !isProduction,
            compress: ((isProduction)?
                    {
                        drop_console: true, // eslint-disable-line camelcase
                        warnings: false
                    }
                :   false),
            mangle: ((isProduction)?
                    {
                        except: ['_'] // don't mangle lodash
                    }
                :   false),
            output: {
                comments: !isProduction
            }
        })
    ],
    resolve: {
        modulesDirectories
    },
    resolveLoader: {
        modulesDirectories
    }
};

module.exports = config;
