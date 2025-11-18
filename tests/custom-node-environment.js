/**
 * Custom Jest environment that removes Node's experimental localStorage getter
 * before delegating to the standard node environment. This prevents Node 20+
 * from throwing a SecurityError when the getter is accessed without
 * --localstorage-file.
 */

delete globalThis.localStorage;

module.exports = require('jest-environment-node');
