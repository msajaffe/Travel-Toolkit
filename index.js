var request = require('request');
var cheerio = require('cheerio');
var express = require('express');
var watson = require('watson-developer-cloud');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3001;

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});
// Routing
app.use(express.static(__dirname));

var language_identification = watson.language_identification({
  username: '788d0644-e1ec-44a0-b361-1b63d99a53d6',
  password: 'I5SZccakVBZ1',
  version: 'v1'
});
var personality_insights = watson.personality_insights({
  username: 'ec93506f-a923-41b4-8187-c300e1a29b1a',
  password: 'Rkh7hEhKTQQO',
  version: 'v2'
});
io.on('connection', function (socket) {
  console.log("connected");
  socket.on('getFeed', function (data) {
    var url = 'http://www.gogobot.com/' + data.country;
    var usernames = [];
    var msgs = [];
    var ratings = [];
    var imgs = [];
    request(url, function(err, resp, body) {
      $ = cheerio.load(body);
      $('.reviewList').find('.userName').find('.dlink').each(function (lol){
        usernames.push($(this).text());
      });
      $('.reviewList').find('.placeRating').find('.readable span p').each(function (lol){
       msgs.push(($(this).text()));
     });
      $('.reviewList').find('.placeRating').find('.recommendRatings .star_rating_background').each(function (lol){
       ratings.push(($(this).attr("title")).split(" ")[0]);
     });
      $('.userProfile img').each(function (lol){
       imgs.push($(this).attr("src"));
     });
      var toSend = {usernames: usernames, msgs: msgs, ratings: ratings, imgs: imgs};
      console.log(toSend);
      socket.emit('send feed', toSend);
    });
  });


  socket.on('getDangers', function (data) {
    data.city = data.city || data.country;
    var url = 'http://www.virtualtourist.com/search/location/?keyword=' + data.city;
    var tips = [];
    var msgs = [];
    var imgs = [];
    var redirect = 'google.com';
    request(url, function(err, resp, body) {
      $ = cheerio.load(body);
      $(".append").find("a").each(function(){
        console.log($(this).text());
        if ($(this).text() === data.city) { 
          redirect = $(this).attr('href');
          return false;
        }
      });
      request(redirect, function(err, resp, body) {
        $ = cheerio.load(body);
        $('*:contains("Warnings and Dangers")').each(function(){
          if( $(this).attr("href")) { 
            redirect = $(this).attr('href');
            return false;
          }
        });
        request(redirect, function(err, resp, body) {
          $ = cheerio.load(body);
          console.log(redirect);
          $(".tip-grid").each(function(){
           $(this).find(".tip-photo a").each(function(){
            imgs.push($(this).attr("href"));
          });
           $(this).find(".tip-content h4 a").each(function(){
            tips.push($(this).text());
          });
           $(this).find(".tip-content .tip-copy p").each(function(){
            msgs.push($(this).text());
          });
         });
          
          var toSend = {tips: tips, msgs: msgs, imgs: imgs};
          console.log(toSend);
          socket.emit('send dangers', toSend);
        });
      });
    });
});



socket.on('translate', function (data){
  console.log("hmmmm");
  language_identification.identify({ text: data.text }, function (err, response) {
    if (err)
      console.log('error:', err);
    else {
      var translated = JSON.stringify(response, null, 2);
      console.log(translated);
      socket.emit('translated ' + data.text, {lang: translated, message: data.text, name: data.name});
    }
  });
});
socket.on('insight', function (data){
  personality_insights.profile({
    text: data.text },
    function (err, response) {
      if (err)
        console.log('error:', err);
      else {
        console.log(JSON.stringify(response, null, 2));
        socket.emit('get insight', response);
      }
    });
});
});


