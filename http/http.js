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

        if (this.headers)
    }
 }

async (function () {
    let request = new Request({
        method: 'get',
        path: '/',
        host: '127.1.1.1',
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
})()