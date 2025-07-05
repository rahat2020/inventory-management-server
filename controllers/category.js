const Category = require('../models/Category');
const Posts = require('../models/Posts');
const Videos = require('../models/Videos');

const addCategory = async (req, res, next) => {
    try {
        const pd = await Category(req.body)
        const save = await pd.save()
        // res.status(200).json(save)
        res.status(200).json('Category created')

        console.log(save)
    } catch (err) {
        next(err);
        console.log(err);
    }

}
const getCategory = async (req, res, next) => {
    try {
        const pd = await Category.find()
        res.status(200).json(pd)
    } catch (err) {
        console.log(err)
        next(err)
    }
}

const categoryById =  async (req, res, next) => {
    try {
        const articles = await Category.findById(req.params.id)
        res.status(200).json(articles)
    } catch (err) {
        console.log(err)
        next(err)
    }
}
const updateCategory =  async (req, res, next) => {
    const params = req.params.id
    try {
        const articles = await Category.findByIdAndUpdate(params, {$set: req.body}, {new: true})
        articles && res.status(200).json('category updated')
    } catch (err) {
        console.log(err)
        next(err)
    }
}
// FILTER BY CATEGORY AND GET CATEGORY POSTS
const filterByCategory = async (req, res, next) => {
    try {
        const { category } = req.query;
        let posts;

        if (category) {
            posts = await Posts.find({ category });
        } else {
            posts = await Posts.find({});
        }

        res.json(posts);
        console.log(posts)
    } catch (err) {
        next(err)
    }
}

// FILTER BY CATEGORY AND GET CATEGORY POSTS
const filterByCategoryVideos = async (req, res, next) => {
    try {
        const { category } = req.query;
        let posts;

        if (category) {
            posts = await Videos.find({ category });
        } else {
            posts = await Videos.find({});
        }

        res.json(posts);
        console.log(posts)
    } catch (err) {
        next(err)
    }
}

const deleteCategory = async (req, res, next) => {
    try {
        await Category.findByIdAndDelete(req.params.id)
        res.status(200).json('Category is deleted')
    } catch (err) {
        console.log(err)
        next(err)
    }
}

module.exports ={
    addCategory,getCategory,deleteCategory,categoryById,updateCategory, filterByCategory, filterByCategoryVideos
}