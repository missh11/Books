var express = require('express');
var app = express();
var escape = require('escape-html');
var ascii = require('ascii-art');
var morgan = require('morgan');
var hogan = require('hogan-express');
var allBooks = {};
var request = require('request');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var _ = require('lodash');

app.set('view engine', 'html');
app.engine('html', hogan);
app.set('views', './views');
app.use(morgan("default"));

app.get('/', function (req, res) {
  if (req.query.name) {
    res.send('Hello ' + req.query.name + ', you\'re the best!');
  }
  else {
    res.send('Please set a value for name');
  }
});

app.get('/d/:num1', function (req, res) {
  res.send(req.params.num1);
});

app.get('/sum/:num1/:num2', function (req, res) {
  var sum = parseInt(req.params.num1) + parseInt(req.params.num2);
  res.send(' ' + sum);
});

app.get('/times/:num1/:num2', function (req, res) {
  var times = parseInt(req.params.num1) * parseInt(req.params.num2);
  res.send(' ' + times);
});

app.get('/escape', function (req, res) {
  res.send(escape('<p>hello</p>'));
});

app.get('/ascii/:name', function (req, res) {
  ascii.font(req.params.name, 'Doom', function(rendered){
    res.send('<pre>' + rendered + '</pre>');
  });
});

app.use('/static', express.static('public'));

app.get('/form', function (req, res) {
  if (req.query.name) {

    var date = req.query.dob.month + '/' + req.query.dob.day + '/' + req.query.dob.year;

    res.locals = {name:req.query.name, shoesize:req.query.shoesize, favcolour:req.query.favcolour, dob:date};
    res.render('details');
  }

  else {
    res.redirect('/static');
  }
});

app.get('/addBook', function(req, res) {
    if (req.query.code){
      var ISBN = req.query.code;
      if (/^\d{13}$/.test(ISBN)) {
          request('http://ISBNDB.com/api/v2/json/XW09D335/book/' + ISBN, function (error, response, body) {
          var isbnLookupResult = JSON.parse(body);
          if (!error && response.statusCode === 200 && isbnLookupResult.data && isbnLookupResult.data[0]) {
            // console.log(isbnLookupResult.data[0]);
            var bookDetails = {};
            if (isbnLookupResult.data[0].author_data && isbnLookupResult.data[0].author_data[0] && isbnLookupResult.data[0].author_data[0].name) {
              bookDetails.author = isbnLookupResult.data[0].author_data[0].name;
            }
            else {
              bookDetails.author = "Unknown";
            }
            if (isbnLookupResult.data[0].title_long) {
              bookDetails.title = isbnLookupResult.data[0].title_long;
            }
            else {
              bookDetails.title = isbnLookupResult.data[0].title;
            }
            if (isbnLookupResult.data[0].publisher_name) {
              bookDetails.publisher = isbnLookupResult.data[0].publisher_name;
            }
            else {
              bookDetails.publisher = "Unknown";
            }
            bookDetails.ISBN = ISBN;
            if (!allBooks[ISBN]){
              allBooks[ISBN] = bookDetails;
              res.send('ISBN added to collection :)');
              io.emit('Book added :)', bookDetails);
            }
            else {
              res.send('Book already added')
            }
          }
        });
      }
      else {
        res.status(400).send("Invalid ISBN.");
      }
    }
    else {
      res.send('Enter the format and code.');
    }
});

app.get('/removeBook', function(req, res) {
  console.log('#########');
  if (req.query.code){
    var ISBN = req.query.code;
    if (allBooks[ISBN]) {
      delete allBooks[ISBN];
      res.send('Book deleted');
    }
    else {
      res.send('ISBN not in table');
    }
  }
  else {
    res.send('Enter ISBN');
  }
});

app.get('/empty', function(req,res) {
  allBooks = [];
  res.send(allBooks);
});

app.get('/table', function(req,res) {
  res.render('table', {result: _.values(allBooks)});
});

io.on('connection', function(socket){
  // console.log('a user connected');
  socket.on('disconnect', function(){
    // console.log('user disconnected');
  });
});

http.listen(process.env.PORT || 3000, function () {
  console.log('Example app listening on port 3000!');
});
