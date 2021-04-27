const express = require('express');
const session = require('express-session');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');

const indexRouter = require('./routes/index');
const pokerRouter = require('./routes/poker');


const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// allows us to make requests from POSTMAN
app.use(cors());

// set up user session
app.use(session({
  secret: 'Dogs Playing Poker',
  resave: true,
  saveUninitialized: true
}));

// connect url hierarchies to our routers
app.use('/', indexRouter);
app.use('/api/poker', pokerRouter);

// Redirect bad requests to the home page
app.use('*', function (req, res) {
  res.redirect('/');
});

console.log("Running on localhost:3000...");

module.exports = app;
