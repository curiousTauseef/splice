require('dotenv').config({
    silent: true
});
const logger = require('winston');
const http = require('http');
const express = require('express');
const favicon = require('serve-favicon');
const busboy = require('express-busboy');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const cookieParser = require('cookie-parser');
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID
const port = process.env.PORT || 3003;

////////////////////////////////////////////////////
// Basic express configuration
////////////////////////////////////////////////////
const app = express();
app.set('views', __dirname + '/views');
app.set('view engine', 'pug');
app.use(favicon(__dirname + '/public/icons/favicon.ico'));
app.use(require('less-middleware')(__dirname + '/public'));
app.use(express.static(__dirname + '/public'));
app.use(cookieParser());

var sessionMiddleware = session({
    secret: 'spliceqgrs',
    resave: true,
    saveUninitialized: true,
    store: new MongoStore({
        url: process.env.MONGO_CONNECTION_DATA
    })
});

app.use(function (req, res, next) {
    return sessionMiddleware(req, res, next);
});

busboy.extend(app, {
    upload: false
});


app.use(function (req, res, next) {
    req.base_url = req.protocol + '://' + req.get('Host');
    req.host_and_port = req.get('Host');
    req.db = app.locals.db.collection('splice_sites');
    next()
});
app.use("/", require("./routes/index.js"));

var startup = function () {
    logger.info("Splice startup -- %s on port %d", process.env.NODE_ENV, port);
    server = http.Server(app);
    server.listen(port);
}

var url = process.env.MONGO_CONNECTION_DATA;
MongoClient.connect(url, function (err, db) {
    logger.info("Connected correctly to server");
    app.locals.db = db;
    startup();
});