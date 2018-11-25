var express = require('express');
var router = express.Router();

var passport = require('passport');

function isLoggedIn(req) {
  if (req.isAuthenticated()){
      return req.user;
  } else {
      return "Guest";
  }
}

/* GET home page. */
router.get('/', function(req, res, next) {  
  res.render('index', { user: isLoggedIn(req) });
});

router.get('/login', function(req, res) {
  res.render('login', { user: isLoggedIn(req), err: req.flash('err')});
});

router.get('/signup', function(req, res) {
   res.render('signup', { user: isLoggedIn(req), err: req.flash('err')});
});

router.get('/logout', function(req, res) {  
  if(req.isAuthenticated()) {
    req.session.destroy(function(err){
      if(err) console.log(err);
    });
  }
  
  res.redirect('/');     
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
