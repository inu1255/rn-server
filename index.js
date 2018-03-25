const http = require("http");
const https = require("https");
const URL = require("url");
const config = require("./common/config");
const utils = require("./common/utils");

config.main = __filename;

function client(req, res, next) {
    if (req.pathname == "/client") {
        console.log(`get client from ${req.headers["referer"]}`);
        res.writeHead(200);
        res.write(utils.makeClient());
        res.end();
    } else next();
}

function cross(req, res, next) {
    const origin = req.headers["origin"];
    if (origin) {
        let header = req.headers["access-control-request-headers"];
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
        header && res.setHeader("Access-Control-Allow-Headers", header);
    }
    if (req.method == "OPTIONS") {
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
        console.log(`proxy to ${url}`);
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
    let name = req.headers['rn-action'];
    if (name) {
        try {
            let mod = require("./lib/" + name);
            let s = "";
            req.on("data", function(chunk) {
                s += chunk;
            });
            req.on("end", function() {
                try {
                    console.log(name + req.pathname.replace(/\//g, ".") + (s ? s.replace("[", "(").replace("]", ")") : "()"));
                    mod[req.pathname.replace(/\//, "")].apply(mod, JSON.parse(s || "[]")).then(function(data) {
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
    Object.assign(req, URL.parse(req.url));
    [client, cross, auth, proxy, action].reverse().map(x => next => x(req, res, next || (() => console.log("end")))).reduce((a, b) => () => b(a))();
});

app.listen(config.port);