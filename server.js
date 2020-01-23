require('dotenv').config()
let express = require('express');
let mongodb = require('mongodb');
let sanitizedHTML = require('sanitize-html');

let app = express();
let db;

let port = process.env.PORT;
if (port == null || port == '') {
  port = 3000;
}

app.use(express.static('public'));

// 1 - connection string for what or where connect to
// 2 - an object for mongodb config
// 3 - function that the connect method will call after the connection
mongodb.connect(process.env.CONNECTION_STRING, { useNewUrlParser: true, useUnifiedTopology: true }, function(err, client) {
  // client - contain info about the mongodb env that we just connected to
  db = client.db();
  app.listen(port);
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Security
function passwordProtected(req, res, next) {
  res.set('WWW-Authenticate', 'Basic realm="Simple Todo App"');
  // console.log(req.headers.authorization);
  if (req.headers.authorization == process.env.SECURITY_PASSWORD) {
    // console.log(process.env.SECURITY_PASSWORD);
    next();
  } else {
    res.status(401).send('Authentication required');
  }
}

// Add function to to all routes
app.use(passwordProtected);

// CRUD: READ
app.get('/', function(req, res) {
  db.collection('items').find().toArray(function(err, items) {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>To-Do App</title>
      <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.2.1/css/bootstrap.min.css" integrity="sha384-GJzZqFGwb1QTTN6wy59ffF1BuGJpLSa9DkKMp0DgiMDm4iYMj70gZWKYbI706tWS" crossorigin="anonymous">
    </head>
    <body>
      <div class="container">
        <h1 class="display-4 text-center py-1">To-Do App</h1>

        <div class="jumbotron p-3 shadow-sm">
          <form id="create-form" action="/create-item" method="POST">
            <div class="d-flex align-items-center">
              <input id="create-field" name="item" autofocus autocomplete="off" class="form-control mr-3" type="text" style="flex: 1;">
              <button class="btn btn-primary">Add New Item</button>
            </div>
          </form>
        </div>

        <ul id="item-list" class="list-group pb-5"></ul>

      </div>

      <script>
        let items = ${JSON.stringify(items)}
      </script>
      <script src="https://unpkg.com/axios/dist/axios.min.js"></script>
      <script src="/browser.js"></script>
    </body>
    </html>`);
  });
});

// CRUD: CREATE
app.post('/create-item', function(req, res) {
  // 1 - text or input to sanitize/clean up
  // 2 - object for options like what we dont allow (empty array to not allow any html and javascript codes)
  let safeText = sanitizedHTML(req.body.text, { allowedTags: [], allowedAttributes: {} });
  // 1 - object to be stored as a document in database
  // 2 - function to call once its had a chance to create the item/object in the database
  db.collection('items').insertOne({ text: safeText }, function(err, info) {
    res.json(info.ops[0]);
  });
});

// CRUD: UPDATE
app.post('/update-item', function(req, res) {
  let safeText = sanitizedHTML(req.body.text, { allowedTags: [], allowedAttributes: {} });

  // findOneAndUpdate method
  // 1 - which document to update
  // 2 - what we want to update on that document
  // 3 - include a function that gets called once the database action is complete
  db.collection('items').findOneAndUpdate({ _id: new mongodb.ObjectId(req.body.id) }, { $set: { text: safeText } }, function() {
    res.send('Success!');
  });
});

// CRUD: DELETE
app.post('/delete-item', function(req, res) {
  // deleteOne method
  // 1 - select document to delete
  // 2 - include a function that gets called once the database action is complete
  db.collection('items').deleteOne({ _id: new mongodb.ObjectId(req.body.id) }, function() {
    res.send('Success!');
  });
});
