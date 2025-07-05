const router = require("express").Router();
const {
  createPosts,
  getPostsByID,
  getAllPosts,
  updatePosts,
  deletePosts,
  addLikes,
  addDisLikes,
  deleteComment,
  addComments,
  addPostViewers,
} = require("../controllers/posts");

// ADDING POST
router.post("/add", createPosts);
// // UPDATE POST
// router.put("/update/:id", updatePosts);
// // DELETE POST
// router.delete("/delete/:id", deletePosts);
// // GET ALL POST
// router.get("/all-posts", getAllPosts);
// // GET POST BY ID
// router.get("/post/:id", getPostsByID);
// // ADD POST VIEWERS
// router.patch("/post/:id/views", addPostViewers);
// // CREATE LIKES
// router.post("/likes/:id", addLikes);
// // CREATE DISLIKES
// router.post("/dislikes/:id", addDisLikes);
// // GET POST BY CATEGORY
// router.post("/comments/:id", addComments);
// // DELETE COMMENTS
// router.delete("/posts/:id/comments/:commentId", deleteComment);
// // router.delete('/comment/:id/:psotId', deleteComment);

module.exports = router;
