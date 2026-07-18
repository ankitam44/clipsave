// RFC-4122-shaped v4 id without pulling in a crypto polyfill.
// Math.random is fine here: ids only need to be unique within one
// user's local AsyncStorage, never across devices.
export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
