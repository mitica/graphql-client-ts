export type Index<T> = {
  [index: string]: T;
};

export function startWithUpperCase(name: string) {
  if (name && name.length) {
    return name[0].toUpperCase() + name.substr(1);
  }
  return name;
}

export function uniq<T>(items: T[]) {
  return items.filter((value, index, self) => self.indexOf(value) === index);
}

export function timeout<T>(ms: number, promise: Promise<T>): Promise<T> {
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      reject(new Error("timeout"));
    }, ms);
    promise.then(resolve, reject);
  });
}
