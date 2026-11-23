import { handleApi } from "./accounts";

export default {
  async fetch(request, env, ctx) {
    const identity = await ctx.access?.getIdentity();
    const authorized =
      ctx.access?.aud === "local-accounts" &&
      identity?.email === "owner@example.invalid";
    return handleApi(request, env.DB, authorized);
  },
} satisfies ExportedHandler<Env>;
