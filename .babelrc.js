module.exports = {
  babelrc: false,
  presets: [
    ["env", {
      loose: true,
      modules: "commonjs",
      useBuiltIns: "entry",
      include: [],
      targets: {
        node: 6,
        browsers: [
          ">1%",
          "last 2 versions",
          "Firefox ESR",
          "ie 11",
          "not ie < 11" // React doesn"t support IE8 anyway
        ]
      },
      uglify: false
    }],
  ],
  plugins: [
    "transform-runtime",
    "transform-flow-strip-types",
    "transform-export-extensions",
    "syntax-dynamic-import",
    "transform-class-properties",
    "transform-object-rest-spread",
    "syntax-trailing-function-commas",
    "transform-exponentiation-operator",
  ]
};
