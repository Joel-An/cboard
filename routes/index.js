var express = require('express');
var router = express.Router();

var passport = require('passport');
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/login', function(req, res) {
  res.render('login', { err: req.flash('err')});
});

router.get('/signup', function(req, res) {
   res.render('signup', { err: req.flash('err')});
});

router.post('/signup', passport.authenticate('signup', {
  successRedirect : '/', 
  failureRedirect : '/signup', //가입 실패시 redirect할 url주소
  failureFlash : true 
}));
router.post('/login', passport.authenticate('login', {
  successRedirect : '/', 
  failureRedirect : '/login',
  failureFlash : true 
}));

module.exports = router;
