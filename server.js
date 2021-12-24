const http = require('http');
http.createServer((request, response) => {
    let body = [];
    request
        .on('error', (err) => {
            console.log(error, 'error');
        })
        .on('data', (chunk) => {
            body.push(chunk.toString());
            // console.log(body, 'success');
        })
        .on('end', () => {
            body = body.join(' ');
            console.log(body, 'end');
            response.writeHead(200, { 'Content-Type': 'text/html' });
            response.end('hello word\n\rwewieowiwoei');
        });
}).listen(8001);
console.log('http server start');
