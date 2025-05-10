const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth');
const postController = require('../controllers/postController');

// 글 작성
router.post('/', authenticate, postController.createPost);

// 글 목록 조회 (query: groupId, category)
router.get('/', authenticate, postController.getPostsByGroup);

// 글 수정
router.put('/:postId', authenticate, postController.updatePost);

// 글 삭제
router.delete('/:postId', authenticate, postController.deletePost);

module.exports = router;
