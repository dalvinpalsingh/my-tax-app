import { handleApi } from "./api";

export default {
  async fetch(request, env, ctx) {
    const identity = await ctx.access?.getIdentity();
    const authorized = Boolean(
      env.ACCESS_AUDIENCE &&
      env.ACCESS_EMAIL &&
      ctx.access?.aud === env.ACCESS_AUDIENCE &&
      identity?.email === env.ACCESS_EMAIL,
    );
    return handleApi(request, env.DB, authorized);
  },
} satisfies ExportedHandler<Env>;
