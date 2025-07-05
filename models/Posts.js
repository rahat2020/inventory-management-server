const mongoose = require('mongoose');
const User = require('./User');



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

const likesSchema = new mongoose.Schema({
    like: {
        type: Number,
    },
    liker: {
        type: [userSchema],
    },
},{
    timestamps:true,
})

const dislikesSchema = new mongoose.Schema({
    disliker: {
        type: [userSchema],
    },
    dislikes: {
        type: Number,
    },
},{
    timestamps:true,
})

const commentSchema = new mongoose.Schema({
    desc: {
        type: String,
    },
    commentor: {
        type: [userSchema],
    },
   
}, {
    timestamps: true,
});

const postsSchema = new mongoose.Schema({
    user: [userSchema],
    title: {
        type: String,
        required: true,
    },
    desc: {
        type: String,
        required: true,
    },
    status:{
        type: String,
        default: 'pending'
    },
    category: {
        type: String,
        required: true,
    },
    timeToRead: {
        type: String,
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
        type: Number,
        default:0
    },
    postVideos: {
        type: String,
    },
    photos: {
        type: [String]
    },
    photoUrlOne:{
        type: String,
    },
    photoUrlTwo:{
        type: String,
    },
    photoUrlThree:{
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
        required: true,
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

const Posts = mongoose.model('Posts', postsSchema);

module.exports = Posts;
