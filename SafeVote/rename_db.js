const fs = require('fs');
const path = require('path');

const oldPath = path.join(__dirname, 'data', 'students.db');
const newPath = path.join(__dirname, 'data', 'cyber security.db');

if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log('Renamed students.db to cyber security.db');
} else {
    console.log('students.db not found');
}
