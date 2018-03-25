const child = require("child_process");
const config = require("../common/config");
const fs = require("fs");

exports.config = function() {
    return new Promise((resolve, reject) => {
        resolve(config);
    });
};

exports.enable = function(cmd) {
    return new Promise((resolve, reject) => {
        if (config.isWin) {
            cmd = `reg add HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run /v ${config.name} /t REG_SZ /d "node \\"${cmd||config.main}\\"" /f`;
            child.exec(cmd, err => err ? reject(err) : resolve());
        } else {
            resolve();
        }
    });
};

exports.disable = function() {
    return new Promise((resolve, reject) => {
        if (config.isWin) {
            let cmd = `reg delete HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run /v ${config.name} /f`;
            child.exec(cmd, err => err ? reject(err) : resolve());
        } else {
            resolve();
        }
    });
};

exports.autostart = function() {
    return new Promise((resolve, reject) => {
        if (config.isWin) {
            child.exec(`reg QUERY HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run -s`, function(err, stdout, stderr) {
                if (err) reject(err);
                else {
                    let data = stdout.split("\n").map(x => x.split(/\s+/)).filter(x => x.length > 3).map(x => ({ name: x[1], value: x.slice(3).join(" ") }));
                    resolve(data);
                }
            });
        } else {
            resolve([]);
        }
    });
};

exports.status = function() {
    return new Promise((resolve, reject) => {
        exports.autostart().then(function(data) {
            let ok = false;
            for (let item of data) {
                if (item.name == config.name) {
                    ok = true;
                    break;
                }
            }
            resolve(ok);
        }).catch(reject);
    });
};

exports.binDir = function() {
    return new Promise((resolve, reject) => {
        config.isWin ? resolve("C:/Windows/System32") : resolve("/usr/local/bin");
    });
};

exports.run = function(cmd, options) {
    return new Promise((resolve, reject) => {
        child.exec(cmd, options, (err, stdout, stderr) => {
            return err ? reject(err) : resolve({ stdout, stderr });
        });
    });
};

exports.spawn = function(command, args, options) {
    return new Promise((resolve, reject) => {
        let proc = child.spawn(command, args, options);
        resolve(proc.pid);
    });
};

exports.tasks = function() {
    return new Promise((resolve, reject) => {
        if (config.isWin) {
            child.exec(`tasklist /v /fo csv`, function(err, stdout, stderr) {
                if (err) reject(err);
                else {
                    let lines = stdout.split("\n").slice(1);
                    resolve(lines.map(x => x.slice(1, x.length - 1).split('","')).filter(x => x.length > 8).map(x => ({ cmd: x[0], pid: x[1], mem: x[4], user: x[6], time: x[7], title: x[8] })));
                }
            });
        } else {
            child.exec(`ps -ef`, function(err, stdout, stderr) {
                if (err) reject(err);
                else {
                    let lines = stdout.split("\n").slice(1);
                    resolve(lines.map(x => x.split(/\s+/)).filter(x => x.length > 8).map(x => ({ cmd: x.slice(8).join(" "), pid: x[2], ppid: x[3], user: x[1], time: x[7] })));
                }
            });
        }
    });
};

exports.kill = function(pid) {
    return new Promise((resolve, reject) => {
        if (config.isWin) {
            child.exec(`taskkill /pid ${pid} /t /f`, err => err ? reject(err) : resolve());
        } else {
            child.exec(`kill -9 ${pid}`, err => err ? reject(err) : resolve());
        }
    });
};