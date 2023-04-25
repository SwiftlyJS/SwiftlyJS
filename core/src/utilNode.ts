import fs from "node:fs"
import path from "node:path";

export const thisPackageDir = path.resolve(__dirname, '..');

export async function pathExists(filePath: string): Promise<boolean> {
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

export async function upsearch(startDir: string, fileName: string): Promise<string | undefined> {
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
