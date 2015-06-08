require('electron-debug')();

var menubar = require('menubar');
var _       = require('lodash');
var path    = require('path');
var fs      = require('fs');
var ipc     = require('ipc');
var shell   = require('shell');
var request = require('request').defaults({jar: true});

var menu = menubar({
  dir: __dirname,
  preloadWindow: true,
  width: 350,
  height: 370,
  icon: path.join(__dirname, 'images', 'Icon.png')
});

menu.on('ready', function ready() {

  var canQuit = false;
  menu.app.on('will-quit', function tryQuit(e) {
    if (canQuit) return true;
    menu.window = undefined;
    e.preventDefault();
  });

  ipc.on('terminate', function terminate(e) {
    canQuit = true;
    menu.app.terminate();
  });

  ipc.on('open-dir', function openDir(e) {
    shell.showItemInFolder(path.join(conf.exec.cwd, 'config.json'));
  });


  var conf = loadConfig();

  function loadConfig() {
    var dir = path.join(menu.app.getPath('userData'), 'data');
    var configFile = dir + '/config.json';
    var conf, data;

    try {
      data = fs.readFileSync(configFile);
    } catch (e) {
      if (e.code === 'ENOENT') {
        fs.mkdirSync(dir);
        fs.writeFileSync(configFile, fs.readFileSync(__dirname + '/config.json'));
        return loadConfig();
      } else {
        throw e;
      }
    }

    try {
      conf = JSON.parse(data.toString());
    } catch (e) {
      throw new Error('Invalid configuration file');
    }

    conf.exec = {
      cwd: dir
    };
    return conf;
  }

  var refreshTimer = null;
  menu.on('show', function() {
    console.log('register refresh timer');
    refreshTimer = setInterval(getStocks, 30000);
  });

  menu.on('hide', function() {
    console.log('clear refresh timer');
    clearInterval(refreshTimer);
  });

  menu.on('after-create-window', function() {
    getStocks();
  });

  function getStocks() {
    console.log('reload config');
    conf = loadConfig();

    var htmlURL = 'http://xueqiu.com/{uid}'.replace('{uid}', conf.uid);
    var stocksURL = 'http://xueqiu.com/stock/portfolio/stocks.json?size=1000&tuid={uid}'.replace('{uid}', conf.uid);
    var stocksPriceURL = 'http://xueqiu.com/stock/quote.json';

    request(htmlURL, function(err, res, body) {
      if (!err && res.statusCode === 200) {
        request(stocksURL, function(err, res, body) {
          if (!err && res.statusCode === 200) {
            var stocks = JSON.parse(body).stocks;
            request({
              uri: stocksPriceURL,
              qs: {
                code: _.pluck(stocks, 'code').join(',')
              }
            }, function(err, res, body) {
              _.map(stocks, function(stock, idx) {
                var s = JSON.parse(body).quotes[idx];
                stock.current = s.current;
                stock.percentage = s.percentage;
                stock.change = s.change;
              });
              menu.window.webContents.send('got-all', stocks);
            });
          }
        });
      }
    });
  }
});
