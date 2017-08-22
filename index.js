var sqlite = require('sql.js');
var debug = require('debug')('database-js-sqlite');
const fs = require('fs');

var m_database = Symbol('database');
var m_filename = Symbol('filename');

class SQLite {
    constructor(database) {
        if (database) {
            this[m_filename] = database;
            if (fs.existsSync(database)) {
                this[m_database] = new sqlite.Database(fs.readFileSync(database));
            } else {
                this[m_database] = new sqlite.Database();
            }
        } else {
            this[m_database] = new sqlite.Database();
            this[m_filename] = null;
        }
    }

    query(sql) {
        var self = this;
        return new Promise((resolve, reject) => {
            let data = self[m_database].exec(sql);
            let results = [];

            debug('Query: %s', sql);
            debug('Data: %o', data);

            if (data.length === 0) {
                debug('No results from query');
                return resolve(results);
            }
            if (data.length != 1) {
                debug('Invalid data returned');
                return reject("Invalid data returned");
            }
            data = data[0];
            for (let value of data.values) {
                let row = {};
                for (let n = 0; n < data.columns.length; n++) {
                    row[data.columns[n]] = value[n];
                }
                results.push(row);
            }
            self.flush().then(() => {
                debug('Results: %o', results);
                resolve(results);
            }).catch(reason => reject(reason));
        });
    }

    execute(sql) {
        var self = this;
        return new Promise((resolve, reject) => {
            try {
                self[m_database].run(sql);
                debug('Statement: %s', sql);

                self.flush().then(() => {
                    resolve();
                }).catch(reason => reject(reason));
            } catch (error) {
                reject(error);
            }
        });
    }

    close() {
        return this.flush();
    }

    flush() {
        var self = this;
        return new Promise((resolve, reject) => {
            if (self[m_filename]) {
                fs.writeFile(self[m_filename], new Buffer(self[m_database].export()), (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = {
    open: function(connection) {
        return new SQLite(connection.Database);
    }
};