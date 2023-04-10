#!/usr/bin/env node

import Parcel from "@parcel/core";
import path from "path"
import { ChildProcess, spawn } from "child_process";
import { program } from "commander"
import fs from "fs-extra"
import { upsearch } from "../util";

const thisPackagePath = path.resolve(__dirname, '..', '..');
const serverEntryPoint = path.join(thisPackagePath, 'scripts/server.ts');

program
  .name('swiftly')
  .description('The offcial tool for developing apps with the Swiftly framework');

program.command('build')
  .description('Build sources into an artifact that can be published')
  .option('--prod, --production', 'Ensure the build is ready for production')
  .option('--dev, --development', 'Do not optimise the sources')
  .action(async (options) => {

    const isDev = !(options.production ?? true) && (options.development ?? false);
    const bundlers = await createBundlers(isDev);

    const results = await Promise.all(bundlers.map(bundler => bundler.run()));

    let bundleCount = 0;
    let buildTime = 0;
    for (const result of results) {
      let { bundleGraph } = result;
      let bundles = bundleGraph.getBundles();
      bundleCount += bundles.length;
      buildTime += result.buildTime;
      console.log(bundles[0].filePath);
    }
    console.log(`✨ Built ${bundleCount} bundles in ${buildTime}ms!`);

  });

program.command('serve')
  .option('-p, --port', 'The port to listen on')
  .action(async (options) => {

    const bundlers = await createBundlers(true);

    let serverProcess: ChildProcess;

    const subscription = await Promise.all(bundlers.map(bundler => bundler.watch(async (err, event) => {

      if (err) {
        throw err;
      }

      if (event!.type === 'buildSuccess') {
        let bundles = event!.bundleGraph.getBundles();
        for (const bundle of bundles) {
          if (path.basename(bundle.getMainEntry()!.filePath) === 'server.ts') {
            if (serverProcess) {
              console.error(`Shutting down server process`);
              await shutdown(serverProcess);
            }
            console.error(`Starting up server process`);
            serverProcess = spawn(process.argv0, [ bundle.filePath ],  { stdio: 'inherit', });
          }
        }
        console.log(`✨ Built ${bundles.length} bundles in ${event!.buildTime}ms!`);
      } else if (event!.type === 'buildFailure') {
        console.log(event!.diagnostics);
      }

    })));

  });

program.parse();

function shutdown(proc: ChildProcess): Promise<void> {
  return new Promise(accept => {
    proc.kill('SIGINT');
    proc.on('exit', () => {
      accept();
    });
  });
}

async function createBundlers(isDev: boolean) {

  const packageJsonPath = await upsearch(process.cwd(), 'package.json');
  if (!packageJsonPath) {
    console.error(`No package.json found in ${process.cwd()} or any of its parent directories.`);
    process.exit(1);
  }
  const packagePath = path.dirname(packageJsonPath);

  await fs.mkdirp(path.join(packagePath, '.swiftly-data', 'build'));

  await fs.copyFile(
    path.join(thisPackagePath, 'scripts', 'browser.ts'), 
    path.join(packagePath, '.swiftly-data', 'build', 'browser.ts'),
  );

  await fs.copyFile(
    path.join(thisPackagePath, 'scripts', 'server.ts'), 
    path.join(packagePath, '.swiftly-data', 'build', 'server.ts'),
  );

  const browserBundler = new Parcel({
    mode: isDev ? 'development' : 'production',
    entries: path.join('.swiftly-data', 'build', 'browser.ts'),
    shouldDisableCache: true,
    shouldPatchConsole: false,
    targets: {
      browser: {
        context: 'browser',
        distDir: 'dist/public',
      }
    },
    // shouldPatchConsole: false,
    defaultConfig: '@parcel/config-default',
    config: path.join(thisPackagePath, 'scripts', 'parcelrc-runtime.json'),
    additionalReporters: [
      {
        packageName: '@parcel/reporter-cli',
        resolveFrom: __dirname,
      }
    ]
  });

  const serverBundler = new Parcel({
    mode: isDev ? 'development' : 'production',
    entries: path.join('.swiftly-data', 'build', 'server.ts'),
    targets: {
      server: {
        context: 'node',
        distDir: 'dist',
      }
    },
    shouldPatchConsole: false,
    shouldDisableCache: true,
    defaultConfig: '@parcel/config-default',
    config: path.join(thisPackagePath, 'scripts', 'parcelrc-runtime.json'),
    additionalReporters: [
      {
        packageName: '@parcel/reporter-cli',
        resolveFrom: __dirname,
      }
    ]
  });

  return [
    browserBundler,
    serverBundler,
  ];

}
