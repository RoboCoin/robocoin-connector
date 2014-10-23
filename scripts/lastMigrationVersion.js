'use strict';

var Connection = require('../data_mappers/PgConnection');

Connection.getConnection().query('SELECT MAX(version) FROM db_versions', function (err, result) {

    if (err) {
        console.err('Error getting latest DB version: ' + err);
        return process.exit(1);
    }

    console.log(result.rows[0].max.toString());
    process.exit(0);
});
