var _   = require('lodash');
var ipc = require('ipc');
var fs  = require('fs');

var templates = {
  stocks: fs.readFileSync(__dirname + '/stocks.tmpl').toString()
};

ipc.on('got-all', function gotAll(data) {
  var content = _.template(templates.stocks)({
    stocks: data
  });
  document.getElementById('container').innerHTML = content;
});

document.getElementById('open-dir').addEventListener('click', function () {
  ipc.send('open-dir');
});

document.getElementById('quit').addEventListener('click', function () {
  ipc.send('terminate');
});
