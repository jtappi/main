'use strict';

/**
 * Manual mock for @anthropic-ai/sdk used by portal Jest tests.
 *
 * Portal tests run from portal/node_modules which does not contain
 * @anthropic-ai/sdk (that package lives in bptracker/node_modules).
 * When portal/server.js mounts bptracker/server.js, the require chain
 * reaches extract.controller.js which imports this SDK.
 *
 * This stub satisfies the require() without making any real API calls.
 * It is mapped via moduleNameMapper in portal/package.json so it applies
 * to every jest.resetModules() re-require in portal.test.js automatically.
 */

const Anthropic = jest.fn().mockImplementation(() => ({
  messages: {
    create: jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: '{"systolic":null,"diastolic":null,"heartRate":null,"confidence":"low"}' }],
    }),
  },
}));

module.exports = Anthropic;
