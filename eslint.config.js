import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: [".cloudflare/**", "dist/**"] },
  ...tseslint.configs.recommended,
);
