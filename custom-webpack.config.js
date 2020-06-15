//needed to prevent error when loading wasm via file-loader import
//see: https://github.com/webpack/webpack/issues/6725

module.exports = {
  module: {
    defaultRules: [
      {
        type: "javascript/auto",
        resolve: {}
      },
      {
        test: /\.json$/i,
        type: "json"
      }
    ]
  }
};
