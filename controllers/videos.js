const Videos = require('../models/Videos');

const addVideo = async (req, res, next) => {

    try {
        const video = await Videos(req.body)
        const save = await video.save()
        // res.status(200).json(save)
        save && res.status(200).json('video created')
        console.log(res)
    } catch (err) {
        next(err);
        console.log(err);
    }

}
// ADDING POSTS COMMENTS
const addVideoComments = async (req, res, next) => {
    const id = req.params.id
    const { desc, commentor } = req.body
    try {
        const posts = await Videos.findById(id)
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
        console.log(err)
        next(err)
    }
};

// CREATE LIKES
const addLikes = async (req, res, next) => {
    const id = req.params.id
    const { likes, liker } = req.body
    try {
        const posts = await Videos.findById(id)
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
        console.log(err)
        next(err)
    }
};
// CREATE DISLIKES
const addDisLikes = async (req, res, next) => {
    const id = req.params.id
    const { dislikes, disliker } = req.body
    try {
        const posts = await Videos.findById(id)
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

// DELETE COMMENTS
const deleteComment = async (req, res, next) => {
    try {
        const postId = req.params.id;
        const commentId = req.params.commentId;

        const post = await Videos.findById(postId);

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
// ALL VIDEOS
const allVideos = async (req, res, next) => {
    try {
        const video = await Videos.find({})
        res.status(200).json(video)
    } catch (err) {
        console.log(err)
        next(err)
    }
}

// VIDEOS BY ID || GET SINGLE VIDEOS
const videosById = async (req, res, next) => {
    try {
        const video = await Videos.findById(req.params.id)
        res.status(200).json(video)
    } catch (err) {
        console.log(err)
        next(err)
    }
}

// UPDATE VIDEOS
const updateVideos = async (req, res, next) => {
    try {
        const video = await Videos.findByIdAndUpdate(req.params.id,
            { $set: req.body },
            { new: true }
        )
        // res.status(200).json(video)
        video && res.status(200).json('video updated successfully')
        console.log(res)
    } catch (err) {
        next(err)
        console.log(err)
    }
};

// DELETE VIDEOS
const deleteVideos = async (req, res, next) => {
    try {
        await Videos.findByIdAndDelete(req.params.id)
        res.status(200).json('article deleted')
    } catch (err) {
        console.log(err)
        next(err)
    }
}

// ADD VIEWERS
const addVideoViewers = async (req, res, next) => {
    const id = req.params.id;
    try {
        const post = await Videos.findById(id);
        if (post) {
            // Use $inc to increment the viewers field by 1
            const updatedPost = await Videos.findByIdAndUpdate(
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
    addVideo, allVideos,
    videosById, deleteVideos,
    updateVideos, addVideoComments,
    addLikes, addDisLikes,
    deleteComment, addVideoViewers
}