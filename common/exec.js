const child = require("child_process");
const config = require("./config");

exports.autostart = function(cmd) {
    return new Promise((resolve, reject) => {
        if (config.isWin) {
            if (cmd)
                cmd = `reg add HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run /v ${config.main} /t REG_SZ /d 'node "${cmd}"' /f`;
            else
                cmd = `reg delete HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run /v ${config.main} /f`;
            child.exec(cmd, err => err ? reject(err) : resolve());
        }
    });
};

exports.binDir = function() {
    return new Promise((resolve, reject) => {
        config.isWin ? resolve("C:/Windows/System32") : resolve("/usr/local/bin");
    });
};

exports.run = function(cmd, options) {
    return new Promise((resolve, reject) => {
        child.exec(cmd, options, (err, stdout, stderr) => err ? reject(err) : resolve({ stdout, stderr }));
    });
};

exports.spawn = function(command, args, options) {
    return new Promise((resolve, reject) => {
        let proc = child.spawn(command, args, options);
        let stdout = "";
        let stderr = "";
        proc.stdin.on("data", s => stdout += s);
        proc.stdout.on("data", s => stderr += s);
        proc.on("exit", () => resolve({ stdout, stderr }));
        proc.on("error", err => reject(err));
    });
};

exports.tasks = function() {
    return new Promise((resolve, reject) => {
        if (config.isWin) {
            child.exec(`tasklist /v /fo csv`, function(err, stdout, stderr) {
                if (err) reject(err);
                else {
                    let lines = stdout.split("\n").slice(1);
                    resolve(lines.map(x => x.split(",")).filter(x => x.length > 8).map(x => ({ cmd: x[0], pid: x[1], mem: x[4], user: x[6], time: x[7], title: x[8] })));
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
            child.exec(`taskkill /pid ${pid} /t`, err => err ? reject(err) : resolve());
        } else {
            child.exec(`kill -9 ${pid}`, err => err ? reject(err) : resolve());
        }
    });
};