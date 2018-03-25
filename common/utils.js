const fs = require("fs");

let clientJS = "";

exports.makeClient = function(flag) {
    if (clientJS)
        return clientJS;
    let dir = "./lib/";
    let tpl = fs.readFileSync(__dirname + "/client.js", "utf8");
    let filenames = fs.readdirSync(dir);
    let ACTIONS = "";
    for (let name of filenames) {
        if (name.endsWith(".js")) {
            let text = fs.readFileSync(dir + name, "utf8");
            name = name.slice(0, name.length - ".js".length);

            let s = "";
            text.replace(/(\/\*[^/]+\*\/\n)?exports\.(\w+)\s*=\s*function\(([^)]+)?\)\s*{/g, function(x0, comment, fn, args) {
                args = args || "";
                s += `\n${flag&&comment||""}	this.${fn} = function(${args}) { return doAction("${name}", "${fn}", arguments); };`;
            });
            if (s) {
                ACTIONS += `function ${name.toUpperCase()}() {${s}\n}\nthis.${name} = new ${name.toUpperCase()}();\n`;
            }
        }
    }
    tpl = tpl.replace("// ACTIONS", ACTIONS);
    clientJS = tpl;
    return tpl;
};

exports.makeClient();