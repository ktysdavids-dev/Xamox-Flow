// craco.config.js
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// Craco sets NODE_ENV=development for start, NODE_ENV=production for build
const isDevServer = process.env.NODE_ENV !== "production";

const config = {
  enableHealthCheck: process.env.ENABLE_HEALTH_CHECK === "true",
  enableVisualEdits: isDevServer,
};

let setupDevServer;
let babelMetadataPlugin;

if (config.enableVisualEdits) {
  try {
    if (fs.existsSync(path.join(__dirname, "plugins/visual-edits/dev-server-setup.js"))) {
      setupDevServer = require("./plugins/visual-edits/dev-server-setup");
    }
    if (fs.existsSync(path.join(__dirname, "plugins/visual-edits/babel-metadata-plugin.js"))) {
      babelMetadataPlugin = require("./plugins/visual-edits/babel-metadata-plugin");
    }
  } catch (e) {
    // Plugins opcionales
  }
}

let WebpackHealthPlugin;
let setupHealthEndpoints;
let healthPluginInstance;

if (config.enableHealthCheck) {
  try {
    if (fs.existsSync(path.join(__dirname, "plugins/health-check/webpack-health-plugin.js"))) {
      WebpackHealthPlugin = require("./plugins/health-check/webpack-health-plugin");
      setupHealthEndpoints = require("./plugins/health-check/health-endpoints");
      healthPluginInstance = new WebpackHealthPlugin();
    }
  } catch (e) {
    // Health check opcional
  }
}

// Sin bloque eslint: DISABLE_ESLINT_PLUGIN=true en scripts y evita merges raros con Craco 7.
const webpackConfig = {
  webpack: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    configure: (webpackCfg) => {
      if (Array.isArray(webpackCfg.plugins)) {
        webpackCfg.plugins = webpackCfg.plugins.filter(
          (p) => !p || !p.constructor || p.constructor.name !== "ForkTsCheckerWebpackPlugin",
        );
      }

      webpackCfg.watchOptions = {
        ...webpackCfg.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/build/**",
          "**/dist/**",
          "**/coverage/**",
          "**/public/**",
        ],
      };

      if (config.enableHealthCheck && healthPluginInstance) {
        webpackCfg.plugins.push(healthPluginInstance);
      }
      return webpackCfg;
    },
  },
};

if (config.enableVisualEdits && babelMetadataPlugin) {
  webpackConfig.babel = {
    plugins: [babelMetadataPlugin],
  };
}

webpackConfig.devServer = (devServerConfig) => {
  const cfg =
    devServerConfig && typeof devServerConfig === "object" ? { ...devServerConfig } : {};

  cfg.allowedHosts = "all";
  cfg.host = process.env.HOST || "0.0.0.0";

  cfg.client = {
    ...(cfg.client || {}),
    overlay: false,
  };

  let out = cfg;
  if (config.enableVisualEdits && setupDevServer) {
    const patched = setupDevServer(out);
    if (patched && typeof patched === "object") {
      out = patched;
    }
  }

  if (config.enableHealthCheck && setupHealthEndpoints && healthPluginInstance) {
    const originalSetupMiddlewares = out.setupMiddlewares;
    out.setupMiddlewares = (middlewares, devServer) => {
      let m = middlewares;
      if (originalSetupMiddlewares) {
        m = originalSetupMiddlewares(middlewares, devServer);
      }
      setupHealthEndpoints(devServer, healthPluginInstance);
      return m;
    };
  }

  return out;
};

module.exports = webpackConfig;
