import ReactConfig from "@prdev-solutions/eslint-config/react.mjs";

export default [
  ...ReactConfig,
  {
    ignores: ["dist/**"]
  }
];
