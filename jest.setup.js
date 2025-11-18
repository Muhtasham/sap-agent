// Jest setup file to mock localStorage
// This is needed because some dependencies (like swagger-ui-express) expect localStorage

const storage = {};

global.localStorage = {
  getItem: (key) => storage[key] || null,
  setItem: (key, value) => { storage[key] = value; },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach(key => delete storage[key]); },
  get length() { return Object.keys(storage).length; },
  key: (index) => Object.keys(storage)[index] || null,
};
