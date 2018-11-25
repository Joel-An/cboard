var express = require('express');
var router = express.Router();

var passport = require('passport');

var Board = require('../models/board');

function getUserInfo(req) {
  if (req.isAuthenticated()){
      return req.user;
  } else {
      return "Guest";
  }
}

/* GET home page. */
router.get('/', function(req, res) {  
  res.render('index', { user: getUserInfo(req) });
});

router.get('/board/free', function(req, res){
  var posts = [];
  res.render('board/free', { user: getUserInfo(req), posts: posts});
});

router.get('/board/best', function(req, res){
  res.render('board/best', { user: getUserInfo(req) });
});

router.get('/write/:board', function(req, res){
  var selectedBoard = req.params.board;
  Board.find({boardType:'Normal'},{nameKor:1,nameEng:1},function(err,board){
    if(err) console.log(err);

    res.render('post/write', { user: getUserInfo(req),boardList:board ,selectedBoard: selectedBoard });    
  });
  
});

router.get('/login', function(req, res) {
  res.render('login', { user: getUserInfo(req), err: req.flash('err')});
});

router.get('/signup', function(req, res) {
   res.render('signup', { user: getUserInfo(req), err: req.flash('err')});
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
