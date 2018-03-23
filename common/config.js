const path = require("path");

const config = {
    name: "ss-server",
    isWin: process.platform == "win32",
    auth: "ssr.inu1255.cn",
    main: path.join(__dirname, "..", "index.js"),
    port: 1314
};

module.exports = config;