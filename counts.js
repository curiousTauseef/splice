require('dotenv').config({
    silent: true
});
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID
const db = {

};

var url = process.env.MONGO_CONNECTION_DATA;
MongoClient.connect(url, function (err, _db) {
    console.log("Connected correctly to server");
    db.exons = _db.collection('exons');
    db.splice = _db.collection('splice_sites');
    db._ = _db;
    run();
});

var count_genes = function (organism, done) {
    db.exons.aggregate([
        { $match: { organism: organism } },
        { $group: { _id: '$gene_id' } },
        {
            $group: {
                _id: null,
                count: { $sum: 1 }
            }
        }
    ], function (err, results) {
        console.log(`Gene count in exons for [${organism}]:  ${results[0].count}`);
        done();
    })
}
var count_mrna = function (organism, done) {
    db.exons.aggregate([
        { $match: { organism: organism } },
        { $unwind: '$mRNA' },
        { $group: { _id: '$mRNA' } },
        {
            $group: {
                _id: null,
                count: { $sum: 1 }
            }
        }
    ], function (err, results) {
        console.log(`MRNA count in exons for [${organism}]:  ${results[0].count}`);
        done();
    })
}

var count_qgrs = function (organism, splice, altsplice, done) {
    var pipeline = [
        { $match: { organism: organism } },
        { $unwind: '$qgrs' }];
    if (splice) {
        pipeline.push({
            $match: { $or: [{ 'qgrs.splice': 'end' }, { 'qgrs.splice': 'begin' }] }

        })
    }
    if (altsplice) {
        pipeline.push({
            $match: { is_alt_spliced: true }
        })
    }

    pipeline.push({ $group: { _id: '$qgrs' } })
    pipeline.push(
        {
            $group: {
                _id: null,
                count: { $sum: 1 }
            }
        }
    );
    pipeline.push({ $limit: 10 });
    db.splice.aggregate(pipeline, function (err, results) {
        if (err) {
            console.error(err);
            done();
            return;
        }
        //console.log(results);
        var alt = altsplice ? "alt-" : "";
        if (splice) {
            console.log(`QGRS count in ${alt}splice sites for [${organism}]:  ${results[0].count}`);
        }
        else {
            console.log(`QGRS count in exons for [${organism}]:  ${results[0].count}`);
        }
        done();
    })
}

var run = function () {
    const async = require('async');
    async.parallel([
        function (done) {
            count_genes('Homo sapiens', done);
        },
        function (done) {
            count_genes('Mus musculus', done);
        },
        function (done) {
            count_mrna('Homo sapiens', done);
        },
        function (done) {
            count_mrna('Mus musculus', done);
        },
        function (done) {
            count_qgrs('Homo sapiens', false, false, done);
        },
        function (done) {
            count_qgrs('Mus musculus', false, false, done);
        },
        function (done) {
            count_qgrs('Homo sapiens', true, false, done);
        },
        function (done) {
            count_qgrs('Mus musculus', true, false, done);
        },
        function (done) {
            count_qgrs('Homo sapiens', true, true, done);
        },
        function (done) {
            count_qgrs('Mus musculus', true, true, done);
        }
    ], function () {
        db._.close();
    })
}