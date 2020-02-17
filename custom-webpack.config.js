module.exports = {
  module: {
    //originally required when using WASM for wcslib.  Not needed now.
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
  },
  node: {
    fs: 'empty'
  }
};
