import fs from "fs"
import path from "path";

export type Json = null | boolean | number | string | JsonArray | JsonObject;
export type JsonObject = { [key: string]: Json };
export type JsonArray = Array<Json>;

export function sleep(msec: number): Promise<void> {
  return new Promise(accept => {
    setTimeout(accept, msec);
  });
}

export function serializeForm(form: HTMLFormElement): JsonObject {
  const out: JsonObject = {};
  for (let i = 0; i < form.elements.length; i++) {
    const element = form.elements.item(i)!;
    switch (element.tagName) {
      case 'INPUT': {
        const inputElement = element as HTMLInputElement;
        const type = inputElement.type;
        if (type === 'radio') {
          const name = inputElement.name;
          if (name === null) {
            throw new Error(`<input type="radio" /> does not have a valid 'name' attribute.`);
          }
          const value = element.getAttribute('value');
          if (inputElement.checked) {
            out[name] = value;
          }
        } else if (type === 'checkbox') {
          if (inputElement.checked) {
            out[inputElement.name] = 'on';
          }
        } else {
          out[inputElement.name] = inputElement.value;
        }
      }
    }
  }
  return out;
}

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
