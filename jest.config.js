const path = require('path');
module.exports = {
    cacheDirectory: path.join(process.cwd(), ".cache", "jest"),
    transform: {
        "^.+\\.jsx?$": require.resolve("./build/babel-jest-transformer.js")
    }
};
