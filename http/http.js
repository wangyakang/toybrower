var net = require('net');
const { rejects } = require('assert');

/**
 * @describe http请求
 */

class Request {
    constructor (options = {}) {
        this.method = options.method || 'get';
        this.path = options.path || '/';
        this.host = options.host || '';
        this.post = options.post || '8080';
        this.headers = options.headers || {};
        this.body = options.body || {};
        this.bodyText = '';

        if (!this.headers['Content-Type']) {
            this.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }

        let contentType = this.headers['Content-Type'];
        if (contentType === 'application/json') {
            this.bodyText = JSON.stringify(this.body);
        } else if (contentType === 'application/x-www-form-urlencoded') {
            this.bodyText = Object.keys(this.body).map(key => `${key}=${encodeURIComponent(this.body[key])}`).join('&');
        }
        this.headers['Content-Length'] = this.bodyText.length;
    }
    send (connection) {
        return new Promise (_ => {
            if (connection) {
                connection.write(this.resToString());
            } else {
                connection = net.createConnection({
                    post: this.post,
                    host: this.host
                }, _ => {
                    connection.write(this.resToString());
                })

            }
            connection.on('data', data => {
                console.log(data.toString(), 999);
                // ...
            })
            connection.on('error', err => {
                console.error(err);
                rejects(err);
                connection.end();
            })
        })
    }
    
    resToString () { // 拼接request格式
        // GET / HTTP/1.1           // request line
        // Host: www.google.com     // headers
        // 
        // name=wyk&sex=1           // body
        return `${this.method} ${this.path} HTTP\r\n ${Object.keys(this.headers).map(key => `${key}: ${this.headers[key]}`).join('\r\n')}\r\n\r\n${this.bodyText}`
    }
}

async function httpserver() {
    let request = new Request({
        method: 'POST',
        path: '/',
        host: 'localhost',
        port: '8080',
        headers: {
            'Accept': '*'
        },
        body: {
            name: 'yk'
        }
    });
    let response = await request.send();
    console.log(response, 'Response back body');
}
httpserver();