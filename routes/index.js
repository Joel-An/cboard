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
      return {userType:"Guest"};
  }
}

function isLoggedin(req, res, next) {
  if (req.isAuthenticated()){
    return next();
  }
  res.redirect('/login');
}

function getLastVisitedUrl(req) {
  if(req.session.lastVisitedPost)
    return req.session.lastVisitedPost;
  if(req.session.lastVisitedBoard)
    return req.session.lastVisitedBoard;
  
  return '/'; 
}

/* GET home page. */
router.get('/', function(req, res) {  
  res.render('index', { user: getUserInfo(req) });
});

router.get('/done', function(req, res) {
  res.redirect(getLastVisitedUrl(req));
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
      req.session.lastVisitedBoard = req.url;
      req.session.save();
      res.render('board/index',{ user: getUserInfo(req), boardInfo: boardInfo, posts: populatedPosts , moment: moment});
    });  
  }).catch(function(err) {    
    res.redirect('/');
    console.log(err);
  });
    
});

router.get('/board/:boardName/:id', function(req, res){
  var boardName = req.params.boardName;
  var id = req.params.id;

  var getBoardInfo = Board.findOne({nameEng: boardName});
  var getPost = Post.findById(id);
  
  /*
    TODO: 게시판이 없을 경우 / 게시물이 없을 경우 에러처리를 달리해야함
  */

  Promise.all([getBoardInfo,getPost]).then(function(values) {
    var boardInfo = values[0];
    var post = values[1];

    User.populate(post,{path: 'authorId', select: 'name'})
      .then(function(populatedPost) {
        req.session.lastVisitedPost = req.url;
        req.session.save();
        res.render('post/index',{ user: getUserInfo(req), boardInfo: boardInfo, post: populatedPost , moment: moment});
      });
  }).catch(function(err){
    res.redirect('/');
  });  
});

router.get('/write/:boardName',isLoggedin ,function(req, res){
  var selectedBoard = req.params.boardName;
  Board.find({boardType:'Normal'},{nameKor:1,nameEng:1},function(err,board){
    if(err) console.log(err);

    res.render('post/write', { user: getUserInfo(req),boardList:board ,selectedBoard: selectedBoard });    
  });
  
});

router.get('/modify/post',isLoggedin , function(req, res){
  var boardName = req.query.boardName;
  var postId = req.query.postId;

  var getBoardInfo = Board.find({boardType:'Normal'});
  var getPost = Post.findById(postId);

  Promise.all([getBoardInfo,getPost]).then(function(values){
    var boardList = values[0];
    var post = values[1];

    res.render('post/modify', { user: getUserInfo(req),boardList:boardList ,selectedBoard: boardName ,post:post});        
  }).catch(function(err){
    console.log(err);
    res.redirect(getLastVisitedUrl(req)); 
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
  successRedirect : '/done', 
  failureRedirect : '/signup',
  failureFlash : true 
}));
router.post('/login', passport.authenticate('login', {
  successRedirect : '/done', 
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

router.delete('/delete/post', function(req, res) {

  Post.findById(req.body.postId).then(function(post) {
    if(post.validAuthor(req.user._id)) {
      post.remove();
    }
    res.redirect(req.session.lastVisitedBoard);
  }).catch(function(err) {
    console.log(err);
    res.redirect(req.session.lastVisitedBoard);
  }); 
});


module.exports = router;
