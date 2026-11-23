import { bindings, defineConfig } from "cf/config";

export default defineConfig(({ mode }) => {
  const local = mode === "development";
  const environment = mode === "test" ? "test" : "prod";
  return {
    worker: {
      name: local ? "my-tax-app-local" : `my-tax-app-${environment}`,
      entrypoint: local ? "./worker/local.ts" : "./worker/index.ts",
      compatibilityDate: "2026-11-23",
      workersDev: false,
      previewUrls: false,
      assets: {
        notFoundHandling: "single-page-application",
        runWorkerFirst: ["/api/*"],
      },
      observability: {
        enabled: true,
        logs: { invocationLogs: false },
        traces: { enabled: false },
      },
      access: {
        dev: {
          aud: "local-accounts",
          identity: { email: "owner@example.invalid" },
        },
      },
      env: {
        DB: bindings.d1(
          local
            ? {
                id: "00000000-0000-4000-8000-000000000001",
                name: "my-tax-app-local",
              }
            : { name: `my-tax-app-${environment}` },
        ),
        ACCESS_ISSUER: local ? bindings.text("") : bindings.secret(),
        ACCESS_AUDIENCE: local ? bindings.text("") : bindings.secret(),
        ACCESS_EMAIL: local ? bindings.text("") : bindings.secret(),
      },
    },
  };
});
