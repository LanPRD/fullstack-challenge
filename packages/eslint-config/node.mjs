import NodeConfig from "@prdev-solutions/eslint-config/node.mjs";

export default [
  ...NodeConfig,
  {
    ignores: ["./**/generated/*"],
  },
];
