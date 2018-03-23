const fs = require("fs");
const http = require("http");
const https = require("https");

/**
 * @typedef {Object} Stats
 * @property {()=>Boolean} isFile
 * @property {()=>Boolean} isDirectory
 * @property {()=>Boolean} isBlockDevice
 * @property {()=>Boolean} isCharacterDevice
 * @property {()=>Boolean} isSymbolicLink
 * @property {()=>Boolean} isFIFO
 * @property {()=>Boolean} isSocket
 * @property {Number} dev
 * @property {Number} ino
 * @property {Number} mode
 * @property {Number} nlink
 * @property {Number} uid
 * @property {Number} gid
 * @property {Number} rdev
 * @property {Number} size
 * @property {Number} blksize
 * @property {Number} blocks
 * @property {Number} atimeMs
 * @property {Number} mtimeMs
 * @property {Number} ctimeMs
 * @property {Number} birthtimeMs
 * @property {Date} atime
 * @property {Date} mtime
 * @property {Date} ctime
 * @property {Date} birthtime
 */

/**
 * 读文件
 * @param {String|Number|Buffer|URL} path 
 * @param {String | { encoding?: string, mode?: string | number, flag?: string }} [options] 
 * @returns {Promise<String|Buffer>}
 */
exports.readFile = function(path, options) {
    return new Promise((resolve, reject) => fs.readFile(path, options, (err, data) => err ? reject(err) : resolve(data.toString())));
};

/**
 * 写文件
 * @param {String|Number|Buffer|URL} path 
 * @param {Any} data 
 * @param {String | { encoding?: string, mode?: string | number, flag?: string }} [options] 
 */
exports.writeFile = function(path, data, options) {
    return new Promise((resolve, reject) => fs.writeFile(path, data, options, (err, data) => err ? reject(err) : resolve(data)));
};

/**
 * 文件信息
 * @param {String|Number|Buffer|URL} path 
 * @returns {Promise<Stats>}
 */
exports.stat = function(path) {
    return new Promise((resolve, reject) => fs.stat(path, (err, data) => err ? reject(err) : resolve(data)));
};

/**
 * 文件是否存在
 * @param {String|Number|Buffer|URL} path 
 * @returns {Promise<Boolean>}
 */
exports.exists = function(path) {
    return new Promise(resolve => fs.exists(path, data => resolve(data)));
};

/**
 * 是否是普通文件
 * @param {String|Number|Buffer|URL} path 
 * @returns {Promise<Boolean>}
 */
exports.isFile = function(path) {
    return new Promise(resolve => fs.stat(path, (err, data) => err ? resolve(false) : resolve(data.isFile())));
};

/**
 * 是否是文件夹
 * @param {String|Number|Buffer|URL} path 
 * @returns {Promise<Boolean>}
 */
exports.isDirectory = function(path) {
    return new Promise(resolve => fs.stat(path, (err, data) => err ? resolve(false) : resolve(data.isDirectory())));
};

/**
 * @param {String} filePath 
 * @return {Promise<Object>}
 */
exports.readJson = function(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, function(err, data) {
			try {
				err ? reject(err) : resolve(new Function("return " + data)());
			} catch (err) {
				reject(err);
			}
        });
    });
};

/**
 * @param {String} filePath 
 * @param {Object} data 
 * @param {Number} [space] 
 * @returns {Promise}
 */
exports.writeJson = function(filePath, data, space) {
    return new Promise((resolve, reject) => {
        fs.writeFile(filePath, space ? JSON.stringify(data, null, space) : JSON.stringify(data), function(err) {
            err ? reject(err) : resolve();
        });
    });
};

/**
 * @param {String} filePath 
 * @returns {Promise<String[]>}
 */
exports.readDir = function(filePath) {
    return new Promise((resolve, reject) => {
        fs.readdir(filePath, function(err, dirs) {
            err ? reject(err) : resolve(dirs);
        });
    });
};

/**
 * @param {String} filePath 要删除的文件/目录
 * @param {(filename:String,isDir:Boolean)=>Boolean} filter 是否删除
 * @returns {Promise}
 */
exports.rm = function rm(filePath, filter) {
    if (!filter) filter = x => true;
    return new Promise((resolve, reject) => {
        fs.stat(filePath, function(err, stat) {
            if (err) resolve();
            else if (stat.isFile())
                filter(filePath, false) ? fs.unlink(filePath, err => err ? reject(err) : resolve()) : resolve();
            else if (stat.isDirectory()) {
                fs.readdir(filePath, function(err, filenames) {
                    err ? reject(err) : Promise.all(filenames.map(x => rm(filePath + "/" + x, filter))).then(function() {
                        filter(filePath, true) ? fs.rmdir(filePath, err => err ? reject(err) : resolve()) : resolve();
                    }, reject).catch(reject);
                });
            }
        });
    });
};

/**
 * 移动文件/文件夹
 * @param {String} srcPath 源文件名
 * @param {String} src2dst 目标文件名
 * @returns {Promise}
 */
exports.mv = function mv(srcPath, dstPath) {
    return new Promise((resolve, reject) => fs.exists(srcPath, ok => ok ? fs.rename(srcPath, dstPath, err => err ? reject(err) : resolve()) : resolve()));
};

/**
 * @param {String} url 
 * @param {String} dstPath 
 * @returns {Promise}
 */
exports.download = function(url, dstPath) {
    return new Promise((resolve, reject) => {
        let HTTP = url.startsWith("https://") ? https : http;
        let req = HTTP.request(url, function(res) {
            res.pipe(fs.createWriteStream(dstPath));
            res.on("end", resolve);
        });
        req.on('error', reject);
        req.end();
    });
};

/**
 * 复制文件/文件夹
 * @param {String} srcPath 源文件名
 * @param {String|(filename:String,isDir:Boolean)=>String} src2dst 目标文件名/function(源文件名)=>目标文件名|空不复制
 * @param {Boolean} overwrite 是否覆盖
 * @returns {Promise}
 */
exports.cp = function cp(srcPath, src2dst, overwrite) {
    if (typeof src2dst != "function") {
        var tmp = src2dst;
        src2dst = x => x.replace(srcPath, tmp);
    }
    return new Promise((resolve, reject) => {
        fs.stat(srcPath, function(err, stat) {
            if (err) reject(err);
            else if (stat.isDirectory()) {
                let dstPath = src2dst(srcPath, true);
                if (!dstPath || srcPath == dstPath) resolve();
                else fs.exists(dstPath, function(ok) {
                    function copydir() {
                        fs.readdir(srcPath, function(err, filenames) {
                            err ? reject(err) : Promise.all(filenames.map(x => cp(srcPath + "/" + x, src2dst, overwrite))).then(resolve, reject).catch(reject);
                        });
                    }
                    ok ? copydir() : fs.mkdir(dstPath, err => err ? reject(err) : copydir());
                });
            } else if (stat.isFile()) {
                let dstPath = src2dst(srcPath, false);
                if (!dstPath || srcPath == dstPath) resolve();
                else {
                    function docopy() {
                        let r = fs.createReadStream(srcPath);
                        r.on("end", resolve);
                        r.on("error", reject);
                        r.pipe(fs.createWriteStream(dstPath));
                    }
                    overwrite ? docopy() : fs.exists(dstPath, ok => ok ? resolve() : docopy());
                }
            }
        });
    });
};

/**
 * 创建文件夹
 * @param {String} dir 
 * @param {Promise}
 */
exports.mkdirs = function mkdirs(dir) {
    var dirs = dir.split(/[\/\\]/);
    let tasks = [];
    for (var i = 1; i <= dirs.length; i++) {
        let tmp = dirs.slice(0, i).join("/");
        tasks.push(() => new Promise((resolve, reject) => fs.exists(tmp, ok => ok ? resolve() : fs.mkdir(tmp, err => err ? reject(err) : resolve()))));
    }
    return Promise.flow(tasks);
};

/**
 * 按顺序执行Promise
 * @param {Array<()=>Promise>} tasks 
 * @returns {Promise<Array>}
 */
Promise.flow = function(tasks) {
    return new Promise((resolve, reject) => {
        var i = 0;
        var ret = [];

        function next(data) {
            ret.push(data);
            if (i < tasks.length)
                tasks[i++]().then(next, reject).catch(reject);
            else
                resolve(ret);
        }
        tasks[i++]().then(next, reject).catch(reject);
    });
};