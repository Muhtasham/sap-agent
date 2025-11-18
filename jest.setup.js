// Jest setup file to mock localStorage
// This is needed because some dependencies (like swagger-ui-express) expect localStorage

global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
