const Posts = require('../models/Posts');
const Videos = require('../models/Videos');

// ADDING POSTS
const createPosts = async (req, res, next) => {
    try {
        const posts = await Posts(req.body)
        const savedPosts = await posts.save()
        savedPosts && res.status(200).json('post created')
        // res.status(200).json('post created successfully')
        // console.log(savedPosts)
    } catch (err) {
        next(err)
    }
};
// ADDING POSTS COMMENTS
const addComments = async (req, res, next) => {
    const id = req.params.id
    const { desc, commentor } = req.body
    try {
        const posts = await Posts.findById(id)
        if (!posts) {
            res.status(404).json('posts not founds')
        }
        const commentsObj = {
            desc, commentor
        }
        posts.comments.push(commentsObj);
        await posts.save()
        res.status(200).json('comments created')
        // newComments && res.status(200).json(newComments)
    } catch (err) {
        // res.status(500).json('internal server error')
        // console.log(err)
        next(err)
    }
};

// CREATE LIKES
const addLikes = async (req, res, next) => {
    const id = req.params.id
    const { likes, liker } = req.body
    try {
        const posts = await Posts.findById(id)
        if (!posts) {
            res.status(404).json('posts not founds')
        }
        const likessObj = {
            likes, liker
        }
        posts.likes.push(likessObj);
        await posts.save()
        res.status(200).json('you liked the post')
        // newComments && res.status(200).json(newComments)
    } catch (err) {
        // res.status(500).json('internal server error')
        // console.log(err)
        next(err)
    }
};

// CREATE DISLIKES
const addDisLikes = async (req, res, next) => {
    const id = req.params.id
    const { dislikes, disliker } = req.body
    try {
        const posts = await Posts.findById(id)
        if (!posts) {
            res.status(404).json('posts not founds')
        }
        const likessObj = {
            dislikes, disliker
        }
        posts.dislikes.push(likessObj);
        await posts.save()
        res.status(200).json('you disliked the post')
        // newComments && res.status(200).json(newComments)
    } catch (err) {
        // res.status(500).json('internal server error')
        console.log(err)
        next(err)
    }
};

// UPDATE POSTS
const updatePosts = async (req, res, next) => {
    try {
        const posts = await Posts.findByIdAndUpdate(req.params.id,
            { $set: req.body },
            { new: true }
        )
        // res.status(200).json(posts)
        posts && res.status(200).json('post updated successfully')
        console.log(res)
    } catch (err) {
        next(err)
        console.log(err)
    }
};

// DELETE POSTS
const deletePosts = async (req, res, next) => {
    try {
        const postsdelete = await Posts.findByIdAndDelete(req.params.id)
        // res.status(200).json(postsdelete)
        postsdelete && res.status(200).json("post deleted successfully")
    } catch (err) {
        next(err)
    }
};

// DELETE COMMENTS
const deleteComment = async (req, res, next) => {
    try {
        const postId = req.params.id;
        const commentId = req.params.commentId;

        const post = await Posts.findById(postId);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Find the comment by its _id
        const commentToDelete = post.comments.find(comment => comment._id.toString() === commentId);

        if (!commentToDelete) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Remove the comment from the post's comments array
        post.comments.pull(commentToDelete);

        // Save the updated post
        await post.save();

        res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (err) {
        next(err);
    }
}

// const deleteComment = async (req, res, next) => {

//     const psotId = req.params.psotId;
//     const id = req.params.id;
//     console.log('psotId',psotId)
//     console.log('id',id)
//     try {
//         const deleteCmnts = await Posts.findByIdAndDelete(req.params.id)
//         console.log(deleteCmnts)
//         try {
//             await Posts.findByIdAndUpdate(psotId, { $pull: { comments: req.params.id } })
//         } catch (err) {
//             next(err);
//         }
//         res.status(200).json('comments has been deleted')
//     } catch (err) {
//         next(err);
//     }
// }


// GET ALL HOTELS
const getAllPosts = async (req, res, next) => {
    try {
        const posts = await Posts.find({})
        res.status(200).json(posts);
    } catch (err) {
        next(err);
    }
};


// GET POSTS BY ID
const getPostsByID = async (req, res, next) => {
    const id = req.params.id;
    try {
        const post = await Posts.findById(id);
        if (!id) {
            res.status(404).json({ message: 'post not found' })
        }
        res.status(200).json(post)
    } catch (err) {
        next(err);
        // console.log(err);
    }
}

const addPostViewers = async (req, res, next) => {
    const id = req.params.id;
    try {
        const post = await Posts.findById(id);
        if (post) {
            // Use $inc to increment the viewers field by 1
            const updatedPost = await Posts.findByIdAndUpdate(
                id,
                { $inc: { viewers: 1 } },
                { new: true }
            );
            res.json(updatedPost);
        } else {
            res.status(404).json({ message: 'Post not found' });
        }
    } catch (err) {
        next(err);
    }
}


module.exports = {
    createPosts,
    getPostsByID,
    getAllPosts,
    updatePosts,
    deletePosts,
    addComments,
    deleteComment,
    addLikes,
    addDisLikes,
    addPostViewers,
}