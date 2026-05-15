type ServiceWorkerContainerLike = Pick<ServiceWorkerContainer, 'register'>;

export interface ServiceWorkerRegistrationDecisionInput {
  mode: string;
  supportsServiceWorker: boolean;
}

export function getServiceWorkerRegistrationDecision({
  mode,
  supportsServiceWorker,
}: ServiceWorkerRegistrationDecisionInput) {
  return {
    shouldRegister: mode === 'production' && supportsServiceWorker,
  };
}

export async function registerCollectaServiceWorker({
  mode,
  serviceWorker,
  url,
}: {
  mode: string;
  serviceWorker?: ServiceWorkerContainerLike;
  url?: string;
}) {
  const decision = getServiceWorkerRegistrationDecision({
    mode,
    supportsServiceWorker: Boolean(serviceWorker),
  });

  if (!decision.shouldRegister || !serviceWorker) {
    return;
  }

  const currentUrl = new URL(url || window.location.href);
  if (currentUrl.protocol !== 'https:' && currentUrl.hostname !== 'localhost' && currentUrl.hostname !== '127.0.0.1') {
    return;
  }

  await serviceWorker.register('/service-worker.js', { scope: '/' });
}
