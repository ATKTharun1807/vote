const https = require('https');
const crypto = require('crypto');

const urls = [
    'https://unpkg.com/lucide@0.419.0/dist/umd/lucide.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js',
    'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css',
    'https://cdn.jsdelivr.net/npm/flatpickr'
];

async function getHash(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = [];
            res.on('data', (chunk) => data.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(data);
                const hash = crypto.createHash('sha384').update(buffer).digest('base64');
                resolve(`sha384-${hash}`);
            });
        }).on('error', reject);
    });
}

async function run() {
    for (const url of urls) {
        try {
            const hash = await getHash(url);
            console.log(`${url} | ${hash}`);
        } catch (e) {
            console.error(`Error with ${url}: ${e.message}`);
        }
    }
}

run();
