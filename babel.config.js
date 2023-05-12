module.exports = {
  babelrc: false,
  presets: [
    ["@babel/preset-env", {
      loose: true,
      modules: "commonjs",
      useBuiltIns: "usage",
      corejs: 3,
      include: [],
      targets: {
        node: 8,
        browsers: 'defaults'
      },
      //debug: true,
    }],
  ],
  plugins: [
    "transform-flow-strip-types",
    //"transform-export-extensions",
    //"syntax-dynamic-import",
  ]
};
