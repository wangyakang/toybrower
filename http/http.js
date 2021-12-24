var net = require('net');
const { rejects } = require('assert');
const { debug } = require('console');
const { runInThisContext } = require('vm');

/**
 * @describe http请求
 */

class Request {
    constructor(options = {}) {
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
            this.bodyText = Object.keys(this.body)
                .map((key) => `${key}=${encodeURIComponent(this.body[key])}`)
                .join('&');
        }
        this.headers['Content-Length'] = this.bodyText.length;
    }
    send(connection) {
        return new Promise((resolve, rejects) => {
            const parser = new ResponseParser();
            if (connection) {
                connection.write(this.resToString());
            } else {
                // console.log(this.port, this.host);
                connection = net.createConnection(
                    {
                        port: this.port,
                        host: this.host,
                    },
                    (_) => {
                        console.log(this.resToString(), 'request str');
                        connection.write(this.resToString());
                    }
                );
            }
            connection.on('data', (data) => {
                // ...

                parser.receive(data.toString());
                // "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nDate: Fri, 24 Dec 2021 02:46:43 GMT\r\nConnection: keep-alive\r\nKeep-Alive: timeout=5\r\nTransfer-Encoding: chunked\r\n\r\nb\r\nhello word\n\r\n0\r\n\r\n"
                if (parser.isFinished) {
                    resolve(parser.response);
                    connection.end();
                }
            });
            connection.on('error', (err) => {
                console.error(err);
                rejects(err);
                connection.end();
            });
        }).catch((error) => {
            console.log(error);
        });
    }

    resToString() {
        // 拼接request格式
        // GET / HTTP/1.1           // request line
        // Host: www.google.com     // headers
        //
        // name=wyk&sex=1           // body
        return `${this.method} ${this.path} HTTP/1.1\r\n${Object.keys(
            this.headers
        )
            .map((key) => `${key}: ${this.headers[key]}`)
            .join('\r\n')}\r\n\r\n${this.bodyText}`;
    }
}

class ResponseParser {
    constructor() {
        // 状态控制
        this.WAITING_STATUS_LINE = 0;
        this.WAITING_STATUS_LINE_END = 1;
        this.WAITING_HEADER_NAME = 2;
        this.WAITING_HEADER_SPACE = 3;
        this.WAITING_HEADER_VALUE = 4;
        this.WAITING_HEADER_LINE_END = 5;
        this.WAITING_HEADER_BLOCK_END = 6;
        this.WAITING_BODY = 7;

        // 数据存储
        this.current = this.WAITING_STATUS_LINE;
        this.statusLine = '';
        this.header = {};
        this.headerName = '';
        this.headerValue = '';
        this.bodyParse = null;
    }
    get isFinished() {
        return this.bodyParse && this.bodyParse.isFinished;
    }
    get response() {
        this.statusLine.match(/HTTP\/1.1 (\d+) ([\s\S]+)/);
        return {
            statusCode: RegExp.$1,
            statusText: RegExp.$2,
            header: this.header,
            body: this.bodyParse.content.join(''), // to do ....
        };
    }
    receive(string) {
        // 接收返回值并处理
        for (let i = 0; i < string.length; i++) {
            this.receiveChar(string.charAt(i));
        }
    }
    receiveChar(char) {
        // 状态机解析返回值，body to do...
        if (this.current === this.WAITING_STATUS_LINE) {
            if (char === '\r') {
                this.current = this.WAITING_STATUS_LINE_END;
            } else {
                this.statusLine += char;
            }
        } else if (this.current === this.WAITING_STATUS_LINE_END) {
            if (char === '\n') {
                this.current = this.WAITING_HEADER_NAME;
            }
        } else if (this.current === this.WAITING_HEADER_NAME) {
            if (char === ':') {
                this.current = this.WAITING_HEADER_SPACE;
            } else if (char === '\r') {
                this.current = this.WAITING_HEADER_BLOCK_END;
                // 在heard解析结束后创建Body分析  node环境默认Transfer-Encoding为chunked
                if (this.header['Transfer-Encoding'] === 'chunked') {
                    this.bodyParse = new TrunkedBodyParser();
                }
            } else {
                this.headerName += char;
            }
        } else if (this.current === this.WAITING_HEADER_SPACE) {
            if (char === ' ') {
                this.current = this.WAITING_HEADER_VALUE;
            }
        } else if (this.current === this.WAITING_HEADER_VALUE) {
            if (char === '\r') {
                this.current = this.WAITING_HEADER_LINE_END;
                this.header[this.headerName] = this.headerValue;
                this.headerName = '';
                this.headerValue = '';
            } else {
                this.headerValue += char;
            }
        } else if (this.current === this.WAITING_HEADER_LINE_END) {
            if (char === '\n') {
                this.current = this.WAITING_HEADER_NAME;
            }
        } else if (this.current === this.WAITING_HEADER_BLOCK_END) {
            if (char === '\n') {
                this.current = this.WAITING_BODY;
            }
        } else if (this.current === this.WAITING_BODY) {
            // 处理返回body值
            // to do ......
            this.bodyParse.receiveChar(char);
        }
    }
}
class TrunkedBodyParser {
    constructor() {
        this.WAITING_LENGTH = 0;
        this.WAITING_LENGTH_LINE_END = 1;
        this.READING_TRUNK = 2;
        this.WAITING_NEW_LINER = 3;
        this.WAITING_NEW_LINER_END = 4;
        this.length = 0;
        this.content = [];
        this.isFinished = false;
        this.current = this.WAITING_LENGTH;
    }
    receiveChar(char) {
        if (this.isFinished && this.length === 0) return;
        if (this.current === this.WAITING_LENGTH) {
            if (char === '\r') {
                if (this.length === 0) {
                    this.isFinished = true;
                }
                this.current = this.WAITING_LENGTH_LINE_END;
            } else {
                this.length *= 16;
                this.length += parseInt(char, 16);
            }
        } else if (this.current === this.WAITING_LENGTH_LINE_END) {
            if (char === '\n') {
                this.current = this.READING_TRUNK;
            }
        } else if (this.current === this.READING_TRUNK) {
            this.content.push(char);
            this.length--;
            if (this.length === 0) {
                this.current = this.WAITING_NEW_LINER;
            }
        } else if (this.current === this.WAITING_NEW_LINER) {
            if (char === '\r') {
                this.current = this.WAITING_NEW_LINER_END;
            }
        } else if (this.current === this.WAITING_NEW_LINER_END) {
            if (char === '\n') {
                this.current = this.WAITING_LENGTH;
            }
        }
    }
}
async function httpserver() {
    let request = new Request({
        method: 'POST',
        path: '/',
        host: '127.0.0.1',
        port: '8001',
        headers: {
            Accept: '*',
        },
        body: {
            name: 'yk',
        },
    });
    let response = await request.send();
    console.log(11, 'Response back body', response);
}
httpserver();
