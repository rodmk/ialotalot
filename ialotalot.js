var Twit = require("twit");
var util = require("util");

var T = new Twit({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

var stream = T.stream("statuses/filter", { track: "alot" });

var rt_patt = /RT @/;
function isRetweet(tweet) {
  return (tweet.retweeted || rt_patt.test(tweet.text));
}

/**
 * captureGroupRegexResp takes in a regular expression with n capture groups,
 * and a reply (a string format with n format parameters) and returns a
 * function that takes in text and outputs a reply formatted by the capture
 * groups.
 *
 * For example:
 * var f = captureGroupRegexResp(/I (\w) you/, "I %s you too!");
 * f("I love you");
 * > "I love you too!"
 */
function captureGroupRegexReply(regex, reply) {
  return function(tweet_text) {
    var match = regex.exec(tweet_text);
    if (match) {
      // Counts the number of capturing groups by looking at the response
      // string formatting.
      // TODO: Count the number of capturing groups in the regex and verify
      // that the two numbers match up.
      var groups = reply.match(/%/g).length;
      var args = [reply].concat(match.slice(1, 1 + groups));
      return util.format.apply(null, args);
    }
  };
}

var resp_fns = [
  captureGroupRegexReply(
    /I (\w+) (\w+)[ ,\.]* alot/i,
    "Alot %s %s as well! :D"
  ),
  captureGroupRegexReply(
    /alot of (\w+)/i,
    "Alot love his cousin, the %s alot, a whole lot!"
  ),
  captureGroupRegexReply(
    /alot of (\w+)/i,
    "%s alot is the best alot ever!"
  ),
];

function statusUpdateCallback(err, reply) {}

function getStreamHandler() {
  var fn_id = 0;
  var MIN_WAIT_TIME = 60000; // 60s in ms
  var last_tweet = Date.now() - MIN_WAIT_TIME;
  var alot_patt = /alot/i;
  return function(tweet) {
    if ((Date.now() > (last_tweet + MIN_WAIT_TIME)) &&
        !isRetweet(tweet) &&
        alot_patt.test(tweet.text)) {
      // Cycle through response types
      var res = resp_fns[fn_id](tweet.text);
      if (res) {
        var status = util.format(
          "@%s %s",
          tweet.user.screen_name,
          res.toUpperCase()
        );

        T.post(
          "statuses/update",
          { status: status, in_reply_to_status_id: tweet.id_str },
          statusUpdateCallback
        );

        last_tweet = Date.now();
        // Pick a random function to use next
        fn_id = Math.floor((Math.random() * resp_fns.length) + 1);
      }
    }
  };
}

stream.on("tweet", getStreamHandler());

// Heroku Hackery
var express = require("express");
var app = express();
app.use(express.logger());

app.get('/', function(request, response) {
  response.send('I AM AN ALOT! HEAR ME ROAR!');
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
