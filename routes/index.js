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
    const boardName = req.params.boardName;
    let matchOpt, sortOpt;

    if (boardName === "best") {
      matchOpt = { isPromoted: true };
      sortOpt = { promotedDate: -1 };
    } else {
      matchOpt = { "boardInfo.nameEng": boardName };
      sortOpt = { date: -1 };
    }

    let posts = await Post.aggregate([
      { $match: matchOpt },
      { $sort: sortOpt },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "postInfo",
          as: "comments"
        }
      },
      {
        $addFields: { commentCount: { $size: "$comments" } }
      }
    ]);

    req.session.lastVisitedBoard = req.url;
    req.session.save();

    res.render("board/index", {
      user: getUserInfo(req),
      posts: posts,
      boardName: boardName,
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
    let post = await Post.findByIdAndUpdate(
      postId,
      {
        $inc: { viewed: 1 }
      },
      { new: true }
    );

    if (post == null) {
      let err = new Error("존재하지 않는 글입니다.");
      err.status = 404;
      throw err;
    }

    if (boardInfo == null) boardInfo = post.boardInfo;

    let comments = await Comment.find({
      postInfo: postId,
      isChild: false
    }).populate("childComments");

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
      selectedBoard: selectedBoard,
      moment: moment
    });
  })
);

router.get(
  "/modify/post",
  isLoggedin,
  wrapAsync(async function(req, res) {
    let postId = req.query.postId;

    let post = await Post.findById(postId);

    res.render("post/modify", {
      user: getUserInfo(req),
      post: post
    });
  })
);

router.get(
  "/myPage",
  isLoggedin,
  wrapAsync(async function(req, res) {
    const myPosts = await Post.aggregate([
      { $match: { "authorInfo._id": req.user._id } },
      { $sort: { date: -1 } },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "postInfo",
          as: "comments"
        }
      },
      {
        $addFields: { commentCount: { $size: "$comments" } }
      }
    ]);

    const myComments = await Comment.find({ "authorInfo._id": req.user._id });

    res.render("myPage/index", {
      user: getUserInfo(req),
      posts: myPosts,
      comments: myComments,
      moment: moment
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
    const userInfo = req.user;

    const newPost = new Post();

    newPost.boardInfo._id = boardInfo._id;
    newPost.boardInfo.nameKor = boardInfo.nameKor;
    newPost.boardInfo.nameEng = boardInfo.nameEng;
    newPost.authorInfo._id = userInfo._id;
    newPost.authorInfo.name = userInfo.name;
    newPost.title = req.body.title;
    newPost.contents = req.body.contents;
    newPost.date = Date.now();

    await newPost.save();
    res.redirect(`/board/${boardInfo.nameEng}`);
  })
);

router.post(
  "/publish/comment",
  isLoggedin,
  wrapAsync(async function(req, res) {
    const comment = new Comment();
    comment.authorInfo._id = mongoose.Types.ObjectId(req.user._id);
    comment.authorInfo.name = req.user.name;
    comment.postInfo = mongoose.Types.ObjectId(req.body.postId);
    comment.contents = req.body.contents;
    comment.date = Date.now();

    await comment.save();
    res.redirect(getLastVisitedUrl(req));
  })
);

router.post(
  "/reply/comment",
  isLoggedin,
  wrapAsync(async function(req, res) {
    const comment = new Comment();

    comment.authorInfo._id = mongoose.Types.ObjectId(req.user._id);
    comment.authorInfo.name = req.user.name;
    comment.postInfo = mongoose.Types.ObjectId(req.body.postId);
    comment.parentComment = mongoose.Types.ObjectId(req.body.commentId);
    comment.contents = req.body.contents;
    comment.date = Date.now();
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
        if (parent != null) {
          parent.childComments.pull(comment._id);
          await parent.save();
        }

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
    let postId = req.body.postId;

    let post = await Post.findById(postId);

    if (post.isValidAuthor(req.user._id)) {
      post.title = req.body.title;
      post.contents = req.body.contents;
      post.isThisModified = true;
      post.modifiedDate = Date.now();

      await post.save();
      res.redirect(`/board/${post.boardInfo.nameEng}/${post.id}`);
    } else {
      let err = new Error("본인의 글만 수정할 수 있습니다.");
      err.status = 403;
      throw err;
    }
  })
);

router.put(
  "/modify/comment",
  isLoggedin,
  wrapAsync(async function(req, res) {
    const comment = await Comment.findById(req.body.commentId);
    if (comment.isValidAuthor(req.user._id)) {
      comment.contents = req.body.contents;
      comment.isThisModified = true;
      comment.modifiedDate = Date.now();

      await comment.save();
      res.status(204);
      res.redirect(getLastVisitedUrl(req));
    }
  })
);

router.put(
  "/upvote/post/:postId",
  isLoggedin,
  wrapAsync(async function(req, res) {
    let post = await Post.findByIdAndUpdate(
      req.params.postId,
      {
        $inc: { upVotes: 1 }
      },
      { new: true }
    );

    if (post.upVotes >= 10 && !post.isPromoted) {
      post.isPromoted = true;
      post.promotedDate = Date.now();
      await post.save();
    }

    res.redirect(req.session.lastVisitedPost);
  })
);

router.put(
  "/vote/comment/:upDown/:commentId",
  isLoggedin,
  wrapAsync(async function(req, res) {
    let incOpt;
    req.params.upDown == "up"
      ? (incOpt = { upVotes: 1 })
      : (incOpt = { downVotes: -1 });

    let comment = await Comment.findByIdAndUpdate(
      req.params.commentId,
      {
        $inc: incOpt
      },
      { new: true }
    );

    res.redirect(req.session.lastVisitedPost);
  })
);

router.put(
  "/downvote/post/:postId",
  isLoggedin,
  wrapAsync(async function(req, res) {
    let post = await Post.findByIdAndUpdate(
      req.params.postId,
      {
        $inc: { downVotes: -1 }
      },
      { new: true }
    );

    res.redirect(req.session.lastVisitedPost);
  })
);

module.exports = router;
