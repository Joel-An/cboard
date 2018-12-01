var express = require("express");
var router = express.Router();

var passport = require("passport");
var moment = require("moment");

var Board = require("../models/board");
var User = require("../models/user");
var Post = require("../models/post");
var Comment = require("../models/comment");
var mongoose = require("mongoose");

function getUserInfo(req) {
  if (req.isAuthenticated()) {
    return req.user;
  } else {
    return { userType: "Guest" };
  }
}

function isLoggedin(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

function getLastVisitedUrl(req) {
  if (req.session.lastVisitedPost) return req.session.lastVisitedPost;
  if (req.session.lastVisitedBoard) return req.session.lastVisitedBoard;

  return "/";
}

function wrapAsync(fn) {
  return function(req, res, next) {
    // 모든 오류를 .catch() 처리하고 next()로 에러처리 미들웨어로 전달
    fn(req, res, next).catch(next);
  };
}

/* GET home page. */
router.get("/", function(req, res) {
  res.render("index", { user: getUserInfo(req) });
});

router.get("/done", function(req, res) {
  res.redirect(getLastVisitedUrl(req));
});

router.get(
  "/board/:boardName",
  wrapAsync(async function(req, res) {
    var boardName = req.params.boardName;

    let boardInfo = await Board.findOne({ nameEng: boardName });

    if (boardInfo == null) {
      let err = new Error("게시판이 존재하지 않습니다.");
      err.status = 404;
      throw err;
    }

    let posts = await Post.find({ boardInfo: boardInfo._id }).populate({
      path: "authorInfo",
      select: "name"
    });

    req.session.lastVisitedBoard = req.url;
    req.session.save();

    res.render("board/index", {
      user: getUserInfo(req),
      boardInfo: boardInfo,
      posts: posts,
      moment: moment
    });
  })
);

router.get(
  "/board/:boardName/:id",
  wrapAsync(async function(req, res) {
    let boardName = req.params.boardName;
    let postId = req.params.id;

    let boardInfo = await Board.findOne({ nameEng: boardName });
    let post = await Post.findById(postId).populate({
      path: "authorInfo",
      select: "name"
    });

    if (post == null) {
      if (boardInfo == null) {
        let err = new Error("존재하지 않는 글입니다.");
        err.status = 404;
        throw err;
      }
    }

    let comments = await Comment.find({ postInfo: postId, isChild: false })
      .populate({ path: "authorInfo", select: "name" })
      .populate({
        path: "childComments",
        populate: { path: "authorInfo", select: "name" }
      });

    post.viewed += 1;
    await post.save();
    req.session.lastVisitedPost = req.url;
    req.session.save();
    res.render("post/index", {
      user: getUserInfo(req),
      boardInfo: boardInfo,
      post: post,
      comments: comments,
      moment: moment
    });
  })
);

router.get(
  "/write/:boardName",
  isLoggedin,
  wrapAsync(async function(req, res) {
    var selectedBoard = req.params.boardName;

    let boardInfo = await Board.find({ boardType: "Normal" }).select(
      "nameKor nameEng"
    );

    res.render("post/write", {
      user: getUserInfo(req),
      boardList: boardInfo,
      selectedBoard: selectedBoard
    });
  })
);

router.get(
  "/modify/post",
  isLoggedin,
  wrapAsync(async function(req, res) {
    let boardName = req.query.boardName;
    let postId = req.query.postId;

    let boardInfo = await Board.find({ boardType: "Normal" });
    let post = await Post.findById(postId);

    res.render("post/modify", {
      user: getUserInfo(req),
      boardList: boardInfo,
      selectedBoard: boardName,
      post: post
    });
  })
);

router.get("/login", function(req, res) {
  res.render("login", { user: getUserInfo(req), err: req.flash("err") });
});

router.get("/signup", function(req, res) {
  res.render("signup", { user: getUserInfo(req), err: req.flash("err") });
});

router.get("/logout", function(req, res) {
  if (req.isAuthenticated()) {
    req.session.destroy(function(err) {
      if (err) console.log(err);
    });
  }

  res.redirect("/");
});

router.post(
  "/signup",
  passport.authenticate("signup", {
    successRedirect: "/done",
    failureRedirect: "/signup",
    failureFlash: true
  })
);
router.post(
  "/login",
  passport.authenticate("login", {
    successRedirect: "/done",
    failureRedirect: "/login",
    failureFlash: true
  })
);

router.post(
  "/publish/post",
  isLoggedin,
  wrapAsync(async function(req, res) {
    const boardInfo = await Board.findOne({ nameEng: req.body.selectedBoard });
    const userInfo = await User.findOne({ _id: req.user._id });

    const newPost = new Post();

    newPost.boardInfo = boardInfo._id;
    newPost.authorInfo = userInfo._id;
    newPost.title = req.body.title;
    newPost.contents = req.body.contents;

    await newPost.save();
    res.redirect(`/board/${boardInfo.nameEng}`);
  })
);

router.post(
  "/publish/comment",
  isLoggedin,
  wrapAsync(async function(req, res) {
    const comment = new Comment();
    comment.authorInfo = mongoose.Types.ObjectId(req.user._id);
    comment.postInfo = mongoose.Types.ObjectId(req.body.postId);
    comment.contents = req.body.contents;

    await comment.save();
    res.redirect(getLastVisitedUrl(req));
  })
);

router.post(
  "/reply/comment",
  isLoggedin,
  wrapAsync(async function(req, res) {
    const comment = new Comment();

    comment.authorInfo = mongoose.Types.ObjectId(req.user._id);
    comment.postInfo = mongoose.Types.ObjectId(req.body.postId);
    comment.parentComment = mongoose.Types.ObjectId(req.body.commentId);
    comment.contents = req.body.contents;
    comment.isChild = true;

    await comment.save();
    const parent = await Comment.findById(comment.parentComment);

    parent.childComments.push(comment._id);
    await parent.save();

    res.redirect(getLastVisitedUrl(req));
  })
);

router.delete(
  "/delete/post",
  wrapAsync(async function(req, res) {
    const post = await Post.findById(req.body.postId);

    if (post.isValidAuthor(req.user._id)) {
      await post.remove();
    }
    res.status(204);
    res.redirect(req.session.lastVisitedBoard);
  })
);

router.delete(
  "/delete/comment",
  wrapAsync(async function(req, res) {
    const comment = await Comment.findById(req.body.commentId);

    if (comment.isValidAuthor(req.user._id)) {
      if (comment.isChild) {
        const parent = await Comment.findById(comment.parentComment);
        parent.childComments.pull(comment._id);
        await parent.save();
        await comment.remove();
        res.redirect(req.session.lastVisitedPost);
      } else {
        await comment.remove();
        res.redirect(req.session.lastVisitedPost);
      }
    }
  })
);

router.put(
  "/modify/post",
  wrapAsync(async function(req, res) {
    let user = req.user;
    let selectedBoard = req.body.selectedBoard;

    let postId = req.body.postId;
    let title = req.body.title;
    let contents = req.body.contents;

    let board = await Board.findOne({ nameEng: selectedBoard });
    let post = await Post.findById(postId);

    post.boardInfo = mongoose.Types.ObjectId(board.id);
    post.title = title;
    post.contents = contents;

    post.isThisModified = true;
    post.modifiedDate = Date.now();

    await post.save();
    res.redirect(`/board/${board.nameEng}/${post.id}`);
  })
);

router.put("/modify/comment", function(req, res) {
  var contents = req.body.contents;
  var commentId = req.body.commentId;
  var user = req.user;

  Comment.findById(commentId)
    .then(function(comment) {
      if (comment.isValidAuthor(user._id)) {
        comment.contents = contents;
        comment.isThisModified = true;
        comment.modifiedDate = Date.now();

        comment.save().then(function() {
          res.redirect(getLastVisitedUrl(req));
        });
      }
    })
    .catch(function(err) {
      console.log(err);
      res.redirect(getLastVisitedUrl(req));
    });
});

module.exports = router;
