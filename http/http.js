var net = require('net');
const { rejects } = require('assert');
const { debug } = require('console');
const { runInThisContext } = require('vm');

/**
 * @describe http请求
 */

class Request {
    constructor (options = {}) {
        this.method = options.method || 'get';
        this.path = options.path || '/';
        this.host = options.host || '';
        this.port = options.port || '8080';
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
        return new Promise ((resolve, rejects) => {
            const parser = new ResponseParser();
            if (connection) {
                connection.write(this.resToString());
            } else {
                // console.log(this.port, this.host);
                connection = net.createConnection({
                    port: this.port,
                    host: this.host
                }, _ => {
                    // console.log(this.resToString(), 'request str');
                    connection.write(this.resToString());
                })
            }
            connection.on('data', data => {
                console.log(data.toString(), 'response data str');
                // ...
                parser.receive(data.toString());
                if (parser.isFinished) {
                    resolve(paraser.response);
                    connection.end();
                }
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
        return `${this.method} ${this.path} HTTP/1.1\r\n${Object.keys(this.headers).map(key => `${key}: ${this.headers[key]}`).join('\r\n')}\r\n\r\n${this.bodyText}`
    }
}

class ResponseParser {
    constructor () {
        // 状态控制
        this.WAITING_STATUS_LINE = false;
        this.WAITING_STATUS_LINE_END = false;
        this.WAITING_HEADER_KEY = false;
        this.WAITING_HEADER_SPACE = false;
        this.WAITING_HEADER_VALUE = false;
        this.WAITING_HEADER_END = false;
        this.WAITING_HEADER_BLOCK = false;
        this.WAITING_BODY = false;

        // 数据存储
        this.statusLine = '';
        this.header = {};
        this.headerName = '';
        this.headerValue = '';
        this.bodyParse = null;
    }
    receive (string) {
        for (let i = 0; i < string.length; i++) {
            this.receiveStart(string.charAt(i));
        }
        this.isFinished = this.WAITING_BODY
    }
    receiveStart (char) {
        if (this.WAITING_STATUS_LINE) {
            return receiveLine;
        } else {
            
        }
        console.log(char, 'char');
    }
    receiveLine (char)
}

async function httpserver() {
    let request = new Request({
        method: 'POST',
        path: '/',
        host: '127.0.0.1',
        port: '8001',
        headers: {
            'Accept': '*'
        },
        body: {
            name: 'yk'
        }
    });
    let response = await request.send();
    console.log(11, 'Response back body', response);
}
httpserver();