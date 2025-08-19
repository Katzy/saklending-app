const { override } = require('customize-cra');

module.exports = override(
  (config) => {
    config.module.rules = config.module.rules.map(rule => {
      if (rule.oneOf) {
        rule.oneOf = rule.oneOf.map(loader => {
          if (loader.loader && loader.loader.includes('source-map-loader')) {
            loader.options = { ...loader.options, ignoreMissing: true };
          }
          return loader;
        });
      }
      return rule;
    });
    return config;
  }
);