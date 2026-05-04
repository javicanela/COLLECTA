import type { SmartImportCapabilities } from './provider-types';

interface CapabilityProbeInput {
  navigatorLike?: { gpu?: unknown };
  webAssemblyLike?: unknown;
  workerLike?: unknown;
  secureContext?: boolean;
}

export function detectBrowserCapabilities(input: CapabilityProbeInput = {}): SmartImportCapabilities {
  const navigatorLike = input.navigatorLike ?? globalThis.navigator;
  const webAssemblyLike = input.webAssemblyLike ?? globalThis.WebAssembly;
  const workerLike = input.workerLike ?? globalThis.Worker;
  const secureContext = input.secureContext ?? globalThis.isSecureContext ?? false;

  return {
    webGpu: Boolean(navigatorLike && 'gpu' in navigatorLike && navigatorLike.gpu),
    webAssembly: Boolean(webAssemblyLike),
    webWorker: Boolean(workerLike),
    secureContext: Boolean(secureContext),
  };
}
