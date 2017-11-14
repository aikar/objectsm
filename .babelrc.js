const deepmerge = require('deepmerge');
const engines = require("./package.json").engines;
const semver = require("semver");
let minNode = 6;
if (engines && engines.node) {
    if (semver.satisfies("8.0.0", engines.node) && !semver.satisfies("6.0.0", engines.node)) {
        minNode = 8;
    }
}
module.exports = {
    babelrc: false,
    presets: [
        ["env", {
            loose: true,
            modules: "commonjs",
            useBuiltIns: "entry",
            include: [],
            exclude: minNode >= 8 ? ["transform-async-to-generator", "transform-regenerator"] : [],
            targets: {
                node: minNode,
            },
            uglify: false
        }],
    ],
    plugins: [
        "transform-flow-strip-types",
        "transform-export-extensions",
        "syntax-dynamic-import",
        "transform-class-properties",
        "transform-object-rest-spread",
        "syntax-trailing-function-commas",
        "transform-exponentiation-operator",
//            "source-map-support"
    ]

};
