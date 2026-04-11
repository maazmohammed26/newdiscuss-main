// craco.config.js
const path = require("path");

let webpackConfig = {
  eslint: {
    configure: {
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig, { env }) => {
      if (env === 'production') {
        webpackConfig.devtool = false;
      }
      // fork-ts-checker pulls legacy ajv-keywords + root ajv@8 (breaks on Node 22+).
      webpackConfig.plugins = (webpackConfig.plugins || []).filter(
        (p) => p?.constructor?.name !== 'ForkTsCheckerWebpackPlugin'
      );
      webpackConfig.watchOptions = {
        ...webpackConfig.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/build/**',
          '**/dist/**',
          '**/coverage/**',
          '**/public/**',
        ],
      };
      return webpackConfig;
    },
  },
};

webpackConfig.devServer = (devServerConfig) => {
  return devServerConfig;
};

module.exports = webpackConfig;
