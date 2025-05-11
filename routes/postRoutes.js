// routes/postRoutes.js
const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth');
const postController = require('../controllers/postController');

// 게시글 작성
router.post('/', authenticate, postController.createPost);

// 게시글 목록 조회
router.get('/', authenticate, postController.getPostsByGroup);

// 게시글 수정
router.put('/:postId', authenticate, postController.updatePost);

// 게시글 삭제
router.delete('/:postId', authenticate, postController.deletePost);

// 댓글 작성
router.post('/:postId/comments', authenticate, postController.addComment);

// 댓글 조회
router.get('/:postId/comments', authenticate, postController.getComments);

// 체크박스 상태 저장/업데이트
router.post('/:postId/checkmark', authenticate, postController.updateCheckmark);

// 체크박스 상태 조회
router.get('/:postId/checkmark', authenticate, postController.getCheckmark);

// 댓글 삭제
router.delete('/posts/:postId/comments/:commentId', authenticate, postController.deleteComment);

module.exports = router;