"use strict";
const express = require('express');
const router = express.Router();
module.exports = router;



router.get("/", function (req, res) {
    var q = req.session.q;
    if (!q) {
        q = {
            gene: "",
            qgrs: "present",
            altSplice: "yes"
        }
        req.session.q = q;
    }

    res.render("index", {
        q: q
    });
});


router.post("/", function (req, res) {
    var splice_match = {}
    req.session.q = req.body;
    if (req.body.altSplice == 'yes') {
        splice_match = {
            is_alt_spliced: true
        }
    } else if (req.body.altSplice == 'no') {
        splice_match = {
            is_alt_spliced: false
        }
    }

    var gene_match = {}
    var gene_needles = req.body.gene.split(';');
    gene_needles = gene_needles.filter(g => g.trim().length);
    if (gene_needles.length) {
        var gene_searches = [];
        gene_needles.forEach(function (g) {
            gene_searches.push({
                gene_id: g.trim()
            })
            gene_searches.push({
                gene_name: g.trim()
            })
        });
        gene_match = {
            $or: gene_searches
        }
    }

    var matches = []
    matches.push(gene_match);
    matches.push(splice_match);
    if (req.body.organism) {
        matches.push({
            organism: req.body.organism.trim()
        })
    }

    var unwind = {
        $unwind: 'qgrs'
    };

    var qgrs_matches = []
    var pos_match = {}
    if (req.body.qgrs == 'upstream') {
        pos_match = {
            "qgrs.start": {
                $lte: 0
            }
        }
    } else if (req.body.qgrs == 'downstream') {
        pos_match = {
            "qgrs.start": {
                $gte: 0
            }
        }
    }
    qgrs_matches.push(pos_match);
    console.log(pos_match);
    var pipeline = [{
        $match: {
            $and: matches
        }
    }, {
        $unwind: '$qgrs'
    }, {
        $match: {
            $and: qgrs_matches
        }
    }];
    console.log(JSON.stringify(pipeline, null, 2));
    req.db.aggregate(pipeline).toArray(function (err, docs) {
        res.render("index", {
            qgrs: docs,
            q: req.session.q
        });
    });


});