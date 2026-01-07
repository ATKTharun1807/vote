const express = require('express');
const Datastore = require('nedb-promises');
const cors = require('cors');
const path = require('path');

const port = process.env.PORT || 8081;

const server = http.createServer((req, res) => {
    let url = req.url.split('?')[0];
    let filePath = path.join(__dirname, url === '/' ? 'index.html' : url);

    const extname = path.extname(filePath);
    let contentType = 'text/html';
    switch (extname) {
        case '.js': contentType = 'text/javascript'; break;
        case '.css': contentType = 'text/css'; break;
        case '.json': contentType = 'application/json'; break;
        case '.png': contentType = 'image/png'; break;
        case '.jpg': contentType = 'image/jpg'; break;
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code == 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

function startServer(p) {
    server.listen(p, '0.0.0.0', () => {
        console.log(`\n🚀 Server successfully started!`);
        console.log(`🔗 Local Address:  http://localhost:${p}/`);
        console.log(`🌐 Network Access: http://0.0.0.0:${p}/`);
        console.log(`💡 Tip: Share this link for voting.\n`);
    });

    server.on('error', (e) => {
        if (e.code === 'EADDRINUSE') {
            console.warn(`⚠️  Port ${p} is busy, trying ${p + 1}...`);
            startServer(p + 1);
        } else {
            console.error("❌ Server Error:", e);
        }
    });
}

startServer(port);
