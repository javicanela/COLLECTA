import { describe, expect, it } from 'vitest';
import { detectBrowserCapabilities } from './detect-capabilities';

describe('detect capabilities', () => {
  it('returns conservative browser capability booleans', () => {
    const capabilities = detectBrowserCapabilities({
      navigatorLike: { gpu: {} },
      webAssemblyLike: {},
      workerLike: function WorkerLike() {},
      secureContext: true,
    });

    expect(capabilities).toEqual({
      webGpu: true,
      webAssembly: true,
      webWorker: true,
      secureContext: true,
    });
  });
});
