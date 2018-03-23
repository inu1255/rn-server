const http = require("http");
const https = require("https");
const URL = require("url");
const config = require("./common/config");

console.log(config.main);
config.main = __filename;

function cross(req, res, next) {
    const origin = req.headers["origin"];
    if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Allow-Headers", "content-type");
    }
    if (req.method == "OPTION") {
        res.writeHead(200);
        res.end();
    } else {
        next();
    }
};

function auth(req, res, next) {
    if (config.auth && req.headers['rn-auth'] != config.auth) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.write("Not Found");
        res.end();
    } else next();
}

function proxy(req, res, next) {
    let url = req.headers['rn-proxy'];
    if (url) {
        let HTTP = http;
        if (url.startsWith('https://'))
            HTTP = https;
        else if (!url.startsWith('http://'))
            url = 'http://' + url;
        let u = URL.parse(url);
        let headers = {};
        for (let k in req.headers)
            if (k != 'host' && k != 'rn-proxy') headers[k] = req.headers[k];
        let proxyReq = HTTP.request({
            host: u.host,
            port: u.port,
            method: req.method,
            path: u.path,
            headers: headers,
        }, function(proxyRes) {
            res.writeHead(res.statusCode, res.getHeaders());
            proxyRes.pipe(res);
        });
        proxyReq.on('error', function(err) {
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.write(err + "");
            res.end();
        });
        if (req.readable) {
            req.pipe(proxyReq);
        } else {
            proxyReq.end();
        }
    } else next();
}

function action(req, res, next) {
    let mod = req.headers['rn-action'];
    if (mod) {
        try {
            mod = require("./common/" + mod);
            let u = URL.parse(req.url);
            let s = "";
            req.on("data", function(chunk) {
                s += chunk;
            });
            req.on("end", function() {
                try {
                    mod[u.pathname.replace(/\//, "")].apply(mod, JSON.parse(s || "[]")).then(function(data) {
                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.write(JSON.stringify({ no: 200, data }));
                        res.end();
                    }).catch(function(err) {
                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.write(JSON.stringify({ no: 405, msg: err + "" }));
                        res.end();
                    });
                } catch (err) {
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.write(JSON.stringify({ no: 405, msg: err + "" }));
                    res.end();
                }
            });
        } catch (err) {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.write(JSON.stringify({ no: 405, msg: err + "" }));
            res.end();
        }
    } else next();
}

let app = http.createServer(function(req, res) {
    [auth, cross, proxy, action].reverse().map(x => next => x(req, res, next || (() => console.log("end")))).reduce((a, b) => () => b(a))();
});

app.listen(config.port);