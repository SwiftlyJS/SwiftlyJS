
import glob from "glob"
import { Resolver } from '@parcel/plugin';

import fs from "fs"
import path from 'path';

// TODO use options.inputFS for better results

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath, fs.constants.R_OK);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function upsearch(startDir: string, fileName: string): Promise<string | undefined> {
  let currDir = path.resolve(startDir);
  for (;;) {
    const filePath = path.join(currDir, fileName);
    if (await pathExists(filePath)) {
      return filePath;
    }
    const { root, dir } = path.parse(currDir);
    if (root === dir) {
      return;
    }
    currDir = dir;
  }
}

function toWebPath(fileName: string): string {
  const chunks = fileName.split(path.sep);
  let name = chunks[chunks.length-1];
  const i = name.indexOf('.');
  if (i !== -1) {
    name = name.substring(0, i);
  }
  return '/' + chunks.slice(0, chunks.length-1).join('/') + name;
}

export default new Resolver({
  async resolve({ specifier }) {
    if (specifier === 'swiftly!routes') {
      const packageJsonPath = await upsearch(process.cwd(), 'package.json');
      if (packageJsonPath === undefined) {
        return null;
      }
      const packagePath = path.dirname(packageJsonPath);
      const pagesPath = path.join(packagePath, 'src', 'pages');
      const routes = await glob('**/*.?(tsx|jsx)', { cwd: pagesPath });
      let code = '';
      routes.forEach((route, i) => {
        code += `import route${i} from "./pages/${route}"\n`;
      });
      code += `export default [\n  ${routes.map((route, i) => `{ render: route${i}, path: ${JSON.stringify(toWebPath(route))} }`).join(',\n  ')}\n];\n`;
      return {
        filePath: path.join(packagePath, 'src', '___routes.js'),
        code,
      };
    }
    return null;
  }
});

