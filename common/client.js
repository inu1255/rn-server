(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.RNClient = factory();
    }
}(this, function () {
	function RNClient(port, auth) {
		function doAction(mod, fn, args) {
			return new Promise(function(resolve, reject) {
				fetch("http://127.0.0.1:" + port + "/" + fn, {
					method: args.length ? "POST" : "GET",
					body: args.length ? JSON.stringify(Array.from(args)) : undefined,
					headers: {
						'rn-auth': auth,
						'rn-action': mod,
					}
				}).then(function(x) {
					return x.json();
				}).then(function(x) {
					if (x.no == 200) {
						resolve(x.data);
					} else {
						reject(x.msg);
					}
				}).catch(reject);
			});
		};
	
		// ACTIONS
	
		function request(url, body, method, headers) {
			return new Promise((resolve, reject) => {
				var host = url.match(/https?:\/\/[^\/]+/)[0];
				var path = url.slice(host.length);
				fetch("http://127.0.0.1:" + port + path, {
					method: method,
					body: body,
					headers: Object.assign({
						'rn-auth': auth,
						'rn-proxy': host,
					}, headers)
				}).then(function(x) {
					var type = x.headers.get("content-type");
					if (/json/.test(type)) {
						return x.json();
					} else if (/text/.test(type)) {
						return x.text();
					} else {
						return x;
					}
				}).then(resolve).catch(reject);
			});
		}
	
		this.proxy = {
			get: function(url, data, headers) {
				if (typeof data === "object") {
					let li = [];
					for (let k in data) {
						let v = data[k];
						li.push(`${k}=${v}`);
					}
					data = li.join("&");
				}
				if (data)
					url += (url.indexOf("?") < 0 ? "?" : "&") + data;
				return request(url, undefined, "GET", headers);
			},
			postJson: function(uri, data, headers) {
				if (typeof data === "object") data = JSON.stringify(data);
				return request(uri, data, "POST", Object.assign({
					"content-type": "application/json"
				}, headers));
			},
			postForm: function(uri, data, headers) {
				if (typeof data === "object") {
					let li = [];
					for (let k in data) {
						let v = data[k];
						li.push(`${k}=${v}`);
					}
					data = li.join("&");
				}
				return request(uri, data, "POST", Object.assign({
					"content-type": "application/x-www-form-urlencoded"
				}, headers));
			}
		};
	}
	
    return RNClient;
}));