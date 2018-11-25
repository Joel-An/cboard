var express = require('express');
var router = express.Router();

var passport = require('passport');
var moment = require('moment');

var Board = require('../models/board');
var User = require('../models/user');
var Post = require('../models/post');

function getUserInfo(req) {
  if (req.isAuthenticated()){
      return req.user;
  } else {
      return "Guest";
  }
}

function isLoggedin(req, res, next) {
  if (req.isAuthenticated()){
    return next();
  }
  res.redirect('/login');
}

/* GET home page. */
router.get('/', function(req, res) {  
  res.render('index', { user: getUserInfo(req) });
});

router.get('/board/:boardName', function(req, res){
  var boardName = req.params.boardName;

  var getBoardInfo = Board.findOne({nameEng: boardName}); 
  var boardInfo;

  getBoardInfo.then(function(result){
    if(result==null) {
      throw "게시판이 존재하지 않습니다.";
    }
    boardInfo = result;
    return Post.find({boardId: boardInfo._id});
  })
  .then(function(posts){
     User.populate(posts,{path: 'authorId', select: 'name'})
    .then(function(populatedPosts){
      res.render('board/index',{ user: getUserInfo(req), boardInfo: boardInfo, posts: populatedPosts , moment: moment});
    });  
  }).catch(function(err) {    
    res.redirect('/');
    console.log(err);
  });
    
});

router.get('/board/:boardName/:id', function(req, res){
  var posts = [];
  var boardName = req.params.boardName;
  var id = req.params.id;
  res.redirect('/');
});

router.get('/write/:boardName',isLoggedin ,function(req, res){
  var selectedBoard = req.params.boardName;
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

router.post('/publish/post', isLoggedin ,function(req, res) {     
  var userId = req.user._id;
  var board = req.body.selectedBoard;

  var title = req.body.title;
  var contents = req.body.contents;

  var getBoardInfo = Board.findOne({nameEng: board});
  var getUserinfo = User.findOne({_id:userId});

  Promise.all([getBoardInfo,getUserinfo]).then(function(values){
    var newPost = new Post();

    newPost.boardId = values[0]._id;
    newPost.authorId = values[1]._id;

    newPost.title = title;
    newPost.contents = contents;
    
    var boardName = values[0].nameEng;

    newPost.save().then(function(savedPost) {
      res.redirect('/board/'+boardName);
    }).catch(function(err){
      return err; 
    });    
  }).catch(function(err){
    console.log(err);
    res.redirect('/'); 
  });        
});


module.exports = router;
