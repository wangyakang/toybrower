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