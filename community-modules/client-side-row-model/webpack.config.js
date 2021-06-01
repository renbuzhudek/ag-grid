var { CleanWebpackPlugin } = require('clean-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
var path = require('path');
var name ="client-side-row-model";
module.exports = {
    mode:"development",
    devtool: 'source-map',
    entry: {
       [name]: `./src/main.ts`
    },
    output: {
        path: path.join(__dirname, 'dist/'),
        filename: '[name].umd.js',
        library:{
            name:name,
            type:"umd"
        }
    },
    module: {
        rules: [
            {
                test: /\.ts?$/,
                loader: 'ts-loader',
                exclude: /node_modules/,
                options:{
                    configFile:path.resolve(__dirname, "tsconfig.demo.json")
                }
            }
        ]
    },
    
    plugins: [
        new CleanWebpackPlugin()
    ],

    resolve: {
    plugins: [new TsconfigPathsPlugin({configFile :path.resolve(__dirname,"tsconfig.demo.json")})],
        extensions: ['.js',  '.ts', '.json'],
        alias: {
            // tsconfig.json已经配置paths这里无需配置别名了
        }
    },

    externals: {
        "@ag-grid-community/core":"AgGridCore"
    }
}
