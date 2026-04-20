const fs = require('fs');
const path = require('path');
const multerPath = path.join(__dirname, 'node_modules', 'multer');
if (fs.existsSync(multerPath)) {
    console.log('Multer is installed at ' + multerPath);
} else {
    console.log('Multer is NOT installed');
}
