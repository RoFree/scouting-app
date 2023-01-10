const http = require('http');
const qs = require('querystring');
const { EventEmitter } = require('events');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

if (!fs.existsSync('config.example.json') && fs.existsSync('config.json')) {
  console.log('\x1b[35m', '[FORM PROCESSING] ' ,'\x1b[0m' + '\x1b[31m', '  [', '\x1b[0m\x1b[41m', 'ERROR', '\x1b[0m\x1b[31m', '] ' ,'\x1b[0m' + 'Could not finf config.json! Fill out config.example.json and rename it to config.json');
  console.log('\x1b[35m', '[FORM PROCESSING] ' ,'\x1b[0m' + '\x1b[31m', '  [', '\x1b[0m\x1b[41m', 'ERROR', '\x1b[0m\x1b[31m', '] ' ,'\x1b[0m' + 'Killing');
  process.exit();
} else {console.log('\x1b[35m', '[FORM PROCESSING] ' ,'\x1b[0m' + '\x1b[32m', '  [INFO] ' ,'\x1b[0m' + 'Found config.json file!');}

if (fs.statSync("config.json").size < 300) {
  console.log('\x1b[35m', '[FORM PROCESSING] ' ,'\x1b[0m' + '\x1b[31m', '  [', '\x1b[0m\x1b[41m', 'ERROR', '\x1b[0m\x1b[31m', '] ' ,'\x1b[0m' + 'The file config.json seems to be empty! Please fill it out.');
  console.log('\x1b[35m', '[FORM PROCESSING] ' ,'\x1b[0m' + '\x1b[31m', '  [', '\x1b[0m\x1b[41m', 'ERROR', '\x1b[0m\x1b[31m', '] ' ,'\x1b[0m' + 'Killing');
  process.exit();
} else {console.log('\x1b[35m', '[FORM PROCESSING] ' ,'\x1b[0m' + '\x1b[32m', '  [INFO] ' ,'\x1b[0m' + 'The file config.json seems to be filled out');}

console.log('\x1b[35m', '[FORM PROCESSING] ' ,'\x1b[0m' + '\x1b[32m', '[INFO] ' ,'\x1b[0m' + "Ready!")

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/submit') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString(); // convert buffer
    });

    req.on('end', () => {
      let formData = qs.parse(body);
      //console.log(formData);

      const formEmitter = new EventEmitter();
      formEmitter.on('formType', () => {
        if (formData.formType == 'pit') {
            console.log('\x1b[35m', '[FORM PROCESSING] ' ,'\x1b[0m' + "pit recd from " +  req.socket.remoteAddress)
            let db = new sqlite3.Database('data.db', sqlite3.OPEN_READWRITE, (err) => {
                if (err) {
                  console.error('\x1b[35m', '[FORM PROCESSING] ' ,'\x1b[0m' +'\x1b[31m', '[ERROR] ' ,'\x1b[0m' + err.message);
                  res.end('pit form error! ' + err.message);
                }
                console.log('\x1b[35m', '[FORM PROCESSING] ' ,'\x1b[0m' + '\x1b[32m', '[INFO] ' ,'\x1b[0m' + 'Connected to database');
            });
            let stmt = `INSERT INTO pit (event, name, team, game1, game2, game3, game4, game5, game6, game7, game8, game9, game10, game11, game12, game13, game14, game15, game16, game17, game18, game19, game20, confidence, bqual, overall, scoutIP) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            let values = [formData.event, formData.name, formData.team, formData.game1, formData.game2, formData.game3, formData.game4, formData.game5, formData.game6, formData.game7, formData.game8, formData.game9, formData.game10, formData.game11, formData.game12, formData.game13, formData.game14, formData.game15, formData.game16, formData.game17, formData.game18, formData.game19, formData.game20, formData.confidence, formData.bqual, formData.overall, req.socket.remoteAddress];
            res.write("created stmt");
            db.run(stmt, values, function(err) {
                if (err) {
                  console.error('\x1b[35m', '[FORM PROCESSING] ' ,'\x1b[0m' +'\x1b[31m', '[ERROR] ' ,'\x1b[0m' + err.message);
                  res.end('pit form error! ' + err.message);
                }
                console.log('\x1b[35m', '[FORM PROCESSING] ' ,'\x1b[0m' + '\x1b[32m', '[INFO] ' ,'\x1b[0m' +  `row ${this.lastID} inserted`);
                res.write("insterted data with row ID " + this.lastID + "\n");
            });
            db.close((err) => {
                if (err) {
                  console.error('\x1b[35m', '[FORM PROCESSING] ' ,'\x1b[0m' + err.message);
                  res.end('pit form error! ' + err.message);
                }
                console.log('\x1b[35m', '[FORM PROCESSING] ' ,'\x1b[0m' + '\x1b[32m', '[INFO] ' ,'\x1b[0m' +  'db closed');
                res.write("finished writing to DB" + "\n");
            });
            res.end('pit form submitted');
        } else if (formData.formType === 'main') {
            console.log('\x1b[35m', '[FORM PROCESSING] ' ,'\x1b[0m' + '\x1b[32m', '[INFO] ' ,'\x1b[0m' +  "main recd from " +  req.socket.remoteAddress)
            let db = new sqlite3.Database('data.db', sqlite3.OPEN_READWRITE, (err) => {
                if (err) {
                  console.error('\x1b[35m', '[FORM PROCESSING] ' ,'\x1b[0m' +'\x1b[31m', '[ERROR] ' ,'\x1b[0m' +  err.message);
                  res.end('pit form error! ' + err.message);
                }
                console.log('\x1b[35m', '[FORM PROCESSING] ' ,'\x1b[0m' + '\x1b[32m', '[INFO] ' ,'\x1b[0m' +  'Connected to database');
            });
            let stmt = `INSERT INTO main (event, name, team, match, level, game1, game2, game3, game4, game5, game6, game7, game8, game9, game10, game11, game12, game13, game14, game15, game16, game17, game18, game19, game20, game21, game22, game23, game24, game25, teleop, defend, driving, overall, scoutIP) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            let values = [formData.event, formData.name, formData.team, formData.match, formData.level, formData.game1, formData.game2, formData.game3, formData.game4, formData.game5, formData.game6, formData.game7, formData.game8, formData.game9, formData.game10, formData.game11, formData.game12, formData.game13, formData.game14, formData.game15, formData.game16, formData.game17, formData.game18, formData.game19, formData.game20, formData.game21, formData.game22, formData.game23, formData.game24, formData.game25, formData.teleop, formData.defend, formData.driving, formData.overall, req.socket.remoteAddress];
            res.write("created stmt");
            db.run(stmt, values, function(err) {
                if (err) {
                  console.error('\x1b[35m', '[FORM PROCESSING] ' ,'\x1b[0m' +'\x1b[31m', '[ERROR] ' ,'\x1b[0m' +  err.message);
                  res.end('\x1b[35m', '[FORM PROCESSING] ' ,'\x1b[0m' +'\x1b[31m', '[ERROR] ' ,'\x1b[0m' + 'pit form error! ' + err.message);
                }
                console.log('\x1b[35m', '[FORM PROCESSING] ' ,'\x1b[0m' + '\x1b[32m', '[INFO] ' ,'\x1b[0m' +  `row ${this.lastID} inserted`);
                res.write("insterted data with row ID " + this.lastID + "\n");
            });
            db.close((err) => {
                if (err) {
                  console.error('\x1b[35m', '[FORM PROCESSING] ' ,'\x1b[0m' +'\x1b[31m', '[ERROR] ' ,'\x1b[0m' +  err.message);
                  res.end('pit form error! ' + err.message);
                }
                console.log('\x1b[35m', '[FORM PROCESSING] ' ,'\x1b[0m' + '\x1b[32m', '[INFO] ' ,'\x1b[0m' +  'db closed');
                res.write("finished writing to DB" + "\n");
            });
            res.end('main form submitted');
        } else {
          res.end('unknown form type');
          console.log('\x1b[35m', '[FORM PROCESSING] ' ,'\x1b[0m' + "form type not known, got '" + formData.formType + "'")
        }
      });

      formEmitter.emit('formType');
    });
  } else {
    res.end('POST requests only on the /submit URL!');
  }
});

server.listen(766);