
export type Json = null | boolean | number | string | JsonArray | JsonObject;
export type JsonObject = { [key: string]: Json };
export type JsonArray = Array<Json>;

export function sleep(msec: number): Promise<void> {
  return new Promise(accept => {
    setTimeout(accept, msec);
  });
}

export function assert(test: boolean): asserts test {
  if (!test) {
    throw new Error(`Assertion failed. See the stack trace for more information.`);
  }
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

export async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const arr = [];
  for await (const element of iter) {
    arr.push(element);
  }
  return arr;
}
