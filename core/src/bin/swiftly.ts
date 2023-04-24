#!/usr/bin/env node

import Parcel from "@parcel/core";
import path from "path"
import { ChildProcess, spawn } from "child_process";
import { program } from "commander"
import fs from "fs-extra"

import { upsearch } from "../util";
import { verbose, error, info } from "../logger";

const thisPackagePath = path.resolve(__dirname, '..', '..');

program
  .name('swiftly')
  .description('The offcial tool for developing apps with the Swiftly framework');

program.command('build')
  .description('Build sources into an artifact that can be published')
  .option('--prod, --production', 'Ensure the build is ready for production')
  .option('--dev, --development', 'Do not optimise the sources')
  .action(async (options) => {

    const isDev = !(options.production ?? true) && (options.development ?? false);
    const { outputDir, cacheDir } = await getDirectories(isDev);
    const bundlers = await createBundlers({ isDev, outputDir, cacheDir });

    const buildResults = await Promise.all(bundlers.map(bundler => bundler.run()));

    let bundleCount = 0;
    let buildTime = 0;
    for (const result of buildResults) {
      let bundles = result.bundleGraph.getBundles();
      bundleCount += bundles.length;
      buildTime += result.buildTime;
    }
    await writeFinalFiles(outputDir);
    info(`✨ Built ${bundleCount} bundles in ${buildTime}ms!`);

  });

program.command('serve')
  .option('-p, --port', 'The port to listen on')
  .option('--prod, --production', 'Ensure the build is ready for production')
  .option('--dev, --development', 'Do not optimise the sources')
  .action(async (options) => {

    const isDev = !(options.production ?? false) && (options.development ?? true);
    const { projectDir, outputDir, cacheDir } = await getDirectories(isDev);
    const port = options.port ?? 3000;

    const bundlers = await createBundlers({ isDev, port, outputDir, cacheDir });

    let serverProcess: ChildProcess;

    // process.on('exit', () => shutdown(serverProcess));

    const subscription = await Promise.all(bundlers.map(bundler => bundler.watch(async (err, event) => {

      if (err) {
        throw err;
      }

      if (event!.type === 'buildSuccess') {
        let bundles = event!.bundleGraph.getBundles();
        if (!isDev) {
          for (const bundle of bundles) {
            if (path.basename(bundle.getMainEntry()!.filePath) === 'server.ts') {
              if (serverProcess) {
                verbose(`Shutting down server process`);
                await shutdown(serverProcess);
              }
              verbose(`Starting up server process`);
              serverProcess = spawn(process.argv0, [ bundle.filePath ],  { stdio: 'inherit', });
            }
          }
        }
        await writeFinalFiles(outputDir);
        info(`✨ Built ${bundles.length} bundles in ${event!.buildTime}ms!`);
      } else if (event!.type === 'buildFailure') {
        error(event!.diagnostics.toString());
      }

    })));

  });

program.parse();

function shutdown(proc: ChildProcess): Promise<void> {
  return new Promise(accept => {
    proc.kill('SIGINT');
    let timer: NodeJS.Timeout | null = setTimeout(() => {
      proc.kill('SIGKILL');
      timer = null;
    }, 5000);
    proc.on('exit', () => {
      console.error('Process exited');
      if (timer) {
        clearTimeout(timer);
      }
      accept();
    });
  });
}

interface CreateBundlersOptions {
  isDev: boolean;
  port?: number;
  cacheDir: string;
  outputDir: string;
}

async function createBundlers({ isDev, cacheDir, outputDir, port }: CreateBundlersOptions) {

  const generatedDir = path.join(cacheDir, 'generated');

  await fs.mkdirp(path.join(outputDir, 'public'));
  await fs.mkdirp(cacheDir);
  await fs.mkdirp(generatedDir);

  await Promise.all([
    fs.copyFile(
      path.join(thisPackagePath, 'scripts', 'parcelrc-runtime.json'),
      path.join(generatedDir, '.parcelrc'),
    ),
    fs.copyFile(
      path.join(thisPackagePath, 'scripts', 'browser.ts'),
      path.join(generatedDir, 'browser.ts'),
    ),
    fs.copyFile(
      path.join(thisPackagePath, 'scripts', 'server.ts'),
      path.join(generatedDir, 'server.ts'),
    )
  ]);

  const browserConfig: any = {
    mode: isDev ? 'development' : 'production',
    entries: path.join(generatedDir, 'browser.ts'),
    shouldDisableCache: true,
    shouldPatchConsole: false,
    targets: {
      browser: {
        context: 'browser',
        distDir: path.join(outputDir, 'public'),
      }
    },
    defaultConfig: '@parcel/config-default',
    config: path.join(generatedDir, '.parcelrc'),
  }

  if (isDev && port) {
    browserConfig.serveOptions = {
      port,
    }
    browserConfig.hmrOptions = {
      port,
    }
  }

  const browserBundler = new Parcel(browserConfig);

//   const serverBundler = new Parcel({
//     mode: isDev ? 'development' : 'production',
//     entries: path.join(generatedDir, 'server.ts'),
//     targets: {
//       server: {
//         context: 'node',
//         distDir: path.join(outputDir, 'dist'),
//       }
//     },
//     shouldPatchConsole: false,
//     shouldDisableCache: true,
//     defaultConfig: '@parcel/config-default',
//     config: path.join(generatedDir, '.parcelrc'),
//   });

  return [
    browserBundler,
    // serverBundler,
  ];

}

async function writeFinalFiles(outputDir: string): Promise<void> {
  await fs.promises.writeFile(path.join(outputDir, 'public', 'index.html'), `
<!DOCTYPE html>
<html>
  <head>
    <title>Loading ...</title>
  </head>
  <body>
    <div id="root"></div>
    <script src="/browser.js" async defer></script>
  </body>
</html>
`);
}

async function getDirectories(isDev: boolean) {
  const packageJsonPath = await upsearch(process.cwd(), 'package.json');
  if (!packageJsonPath) {
    console.error(`No package.json found in ${process.cwd()} or any of its parent directories.`);
    process.exit(1);
  }
  const projectDir = path.dirname(packageJsonPath);
  const cacheDir = path.join(projectDir, '.swiftly-data');
  const outputDir = isDev ? path.join(cacheDir, 'dist', 'dev') : path.join(projectDir, 'dist');
  return { projectDir, cacheDir, outputDir };
}
