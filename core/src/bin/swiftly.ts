#!/usr/bin/env node

import path from "node:path"
import CopyPlugin from 'copy-webpack-plugin';
import webpackNodeExternals from 'webpack-node-externals';
import webpack from "webpack"
import WebpackDevServer from "webpack-dev-server"
import { program } from "commander"

import SwiftlyPlugin from "../plugin";
import { thisPackageDir } from "../utilNode";

program.command('build')
  .action(async (opts) => {
    const packageDir = '.'; // TODO
    const distDir = path.join(packageDir, 'dist');
    const compiler = createWebpack({ packageDir, distDir });
    const stats = await new Promise<webpack.MultiStats | undefined>((accept, reject) => {
      compiler.run((err, res) => {
        if (err) reject(err);
        else accept(res);
      });
    });
    if (stats) {
      console.log(stats.toString({ colors: true }));
    }
  });

program.command('serve')
  .option('--prod', 'Build for production use')
  .option('--open', 'Open browser when ready')
  .action(async (opts) => {
    const open = opts.open ?? false;
    const isDebug = !(opts.prod ?? false);
    const packageDir = '.'; // TODO
    const distDir = path.join(packageDir, 'dist');
    const compiler = createWebpack({ packageDir, distDir, isDebug });
    const devServer = new WebpackDevServer({
      open,
      static: path.join(distDir, 'public'),
      historyApiFallback: true,
      // devMiddleware: {
      //   writeToDisk: true
      // }
    }, compiler);
    await devServer.start();
  });

program.parse();

interface CreateWebpackOptions {
  packageDir: string;
  distDir: string;
  isDebug?: boolean;
}

function createWebpack({ packageDir, distDir, isDebug = false }: CreateWebpackOptions): webpack.MultiCompiler {
  packageDir = path.resolve(packageDir);
  distDir = path.resolve(distDir);
  const serverJsPath = path.join(thisPackageDir, 'scripts', 'server.ts');
  const browserJsPath = path.join(thisPackageDir, 'scripts', 'browser.ts');
  const serverConfig: any = {
    entry: path.join(serverJsPath),
    target: 'node',
    mode: isDebug ? 'development' : 'production',
    context: packageDir,
    output: {
      path: distDir,
      filename: 'server.bundle.js',
    },
    node: {
      __dirname: false,
    },
    externalsPresets: { node: true }, // in order to ignore built-in modules like path, fs, etc.
    externals: [webpackNodeExternals({
      allowlist: ['jquery', 'webpack/hot/dev-server'],
    })],
    resolve: {
      extensions: [ '.mjs', '.js', '.jsx', '.ts', '.tsx' ],
    },
    module: {
      rules: [
        {
          test: /\.node$/,
          loader: "node-loader",
        },
        {
          test: /\.(png|jpg|jpeg|svg|gif|svg|eot|ttf|woff)$/,
          type: 'asset/resource'
        },
        {
          test: /\.(m?js|ts)x?$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { targets: 'current node' }],
                ['@babel/preset-react', { importSource: '@emotion/react', runtime: 'automatic' }],
                '@babel/preset-typescript', 
              ],
            }
          }
        }
      ]
    },
    plugins: [
      new SwiftlyPlugin(packageDir, 'server'),
    ]
  };
  const browserConfig: any = {
    entry: browserJsPath,
    target: 'web',
    context: packageDir,
    output: {
      path: path.join(distDir, 'public'),
      filename: 'browser.bundle.js',
    },
    mode: isDebug ? 'development' : 'production',
    resolve: {
      extensions: [ '.mjs', '.js', '.jsx', '.ts', '.tsx' ],
    },
    module: {
      rules: [
        {
          test: /\.(png|jpg|jpeg|svg|gif|svg|eot|ttf|woff)$/,
          type: 'asset/resource'
        },
        {
          test: /\.(m?js|ts)x?$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { targets: 'defaults' }],
                ['@babel/preset-react', { importSource: '@emotion/react', runtime: 'automatic' }],
                '@babel/preset-typescript', 
              ],
            }
          }
        }
      ]
    },
    plugins: [
      new SwiftlyPlugin(packageDir, 'client'),
      // new CopyPlugin({
      //   patterns: [
      //     { from: 'assets', to: path.join(distDir, 'public') },
      //   ],
      // }),
    ],
  }
  if (isDebug) {
    browserConfig.devtool = 'eval-cheap-source-map';
  }
  return webpack([ serverConfig, browserConfig ]);
}
