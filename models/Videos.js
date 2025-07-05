const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
    username: {
        type: String,
    },
    email: {
        type: String,
    },
    role: {
        type: String,
    },
    photo: {
        type: String,
    },
})

const commentSchema = new mongoose.Schema({
    comments: {
        type: String,
    },
    commentor: {
        type: String,
    }
}, {
    timestamps: true,
});

const likesSchema = new mongoose.Schema({
    like: {
        type: Number,
    },
    liker: {
        type: [userSchema],
    },
}, {
    timestamps: true,
})

const dislikesSchema = new mongoose.Schema({
    disliker: {
        type: [userSchema],
    },
    dislikes: {
        type: Number,
    },
}, {
    timestamps: true,
})

const videosSchema = new mongoose.Schema({
    user: [userSchema],
    title: {
        type: String,
        required: true,
    },
    desc: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        default: 'pending'
    },
    viewers: {
        type: Number,
        default:0
    },
    facebook: {
        type: String,
    },
    instagram: {
        type: String,
    },
    linkedin: {
        type: String,
    },
    website: {
        type: String,
    },
    viewers: {
        type: String,
    },
    videoOne: {
        type: String,
    },
    videoTwo: {
        type: String,
    },
    photoOne: {
        type: String,
    },
    photoTwo: {
        type: String,
    },
    photoThree: {
        type: String,
    },
    published: {
        type: Boolean,
        default: false,
    },
    publicationDate: {
        type: Date,
        required: true,
    },
    author: {
        type: String,
    },
    source: {
        type: String,
    },
    comments: [commentSchema],
    likes: [likesSchema],
    dislikes: [dislikesSchema],
}, {
    timestamps: true,
});

const Videos = mongoose.model('Videos', videosSchema);

module.exports = Videos;
