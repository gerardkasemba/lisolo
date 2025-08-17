// app/types/service-worker.d.ts
declare interface ServiceWorkerRegistration {
  pushManager: PushManager;
}

declare interface Window {
  __nextPWA: {
    register: () => Promise<ServiceWorkerRegistration>;
  };
}