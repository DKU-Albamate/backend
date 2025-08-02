const { supabase } = require('../config/supabaseClient');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const ALLOWED_CATEGORIES = ['안내사항', '신메뉴공지', '대타구하기'];

// 이미지 업로드를 위한 임시 저장소 설정
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 🔹 이미지 업로드
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '이미지가 없습니다.' });
    }

    const file = req.file;
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `post-images/${fileName}`;

    // Supabase Storage에 이미지 업로드
    const { data, error } = await supabase.storage
      .from('post-images')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
      });

    if (error) throw error;

    // 이미지 URL 가져오기
    const { data: { publicUrl } } = supabase.storage
      .from('post-images')
      .getPublicUrl(filePath);

    res.status(200).json({ 
      success: true, 
      imageUrl: publicUrl 
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// 🔹 글 작성
const createPost = async (req, res) => {
  const { groupId, title, content, category, imageUrl, tags } = req.body;
  const userUid = req.user.uid;

  if (!ALLOWED_CATEGORIES.includes(category)) {
    return res.status(400).json({ success: false, message: '잘못된 카테고리입니다.' });
  }

  const { data, error } = await supabase.from('board_posts').insert({
    group_id: groupId,
    author_uid: userUid,
    title,
    content,
    category,
    image_url: imageUrl, // 이미지 URL 추가
    tags,
  }).select().single();

  if (error) return res.status(400).json({ success: false, message: error.message });
  res.status(201).json({ success: true, data });
};

// 🔹 글 목록 조회
const getPostsByGroup = async (req, res) => {
  const { groupId, category } = req.query;

  let query = supabase.from('board_posts').select('*').eq('group_id', groupId);
  if (category) query = query.eq('category', category);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) return res.status(400).json({ success: false, message: error.message });
  res.status(200).json({ success: true, data });
};

// 🔹 글 수정
const updatePost = async (req, res) => {
  const { postId } = req.params;
  const { title, content, imageUrl, tags } = req.body;
  const userUid = req.user.uid;

  const { data: post, error: fetchError } = await supabase.from('board_posts')
    .select('*').eq('id', postId).single();

  if (fetchError || !post)
    return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });

  const { data: roleData } = await supabase.from('group_members')
    .select('group_role').eq('group_id', post.group_id).eq('user_uid', userUid).single();

  const isAuthor = post.author_uid === userUid;
  const isBoss = roleData?.group_role?.toLowerCase() === 'boss';

  if (!isAuthor && !isBoss) {
    return res.status(403).json({ success: false, message: '수정 권한이 없습니다.' });
  }

  const { error: updateError } = await supabase.from('board_posts')
    .update({ 
      title, 
      content, 
      image_url: imageUrl, // 이미지 URL 업데이트 추가
      tags,
      updated_at: new Date() 
    })
    .eq('id', postId);

  if (updateError)
    return res.status(400).json({ success: false, message: updateError.message });

  res.status(200).json({ success: true, message: '수정되었습니다.' });
};

// 🔹 글 삭제
const deletePost = async (req, res) => {
  const { postId } = req.params;
  const userUid = req.user.uid;

  const { data: post, error: fetchError } = await supabase.from('board_posts')
    .select('*').eq('id', postId).single();

  if (fetchError || !post)
    return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });

  const { data: roleData } = await supabase.from('group_members')
    .select('group_role').eq('group_id', post.group_id).eq('user_uid', userUid).single();

  const isAuthor = post.author_uid === userUid;
  const isBoss = roleData?.group_role?.toLowerCase() === 'boss';

  if (!isAuthor && !isBoss) {
    return res.status(403).json({ success: false, message: '삭제 권한이 없습니다.' });
  }

  // 이미지가 있다면 Supabase Storage에서도 삭제
  if (post.image_url) {
    const imagePath = post.image_url.split('/').pop();
    await supabase.storage
      .from('post-images')
      .remove([`post-images/${imagePath}`]);
  }

  const { error } = await supabase.from('board_posts').delete().eq('id', postId);

  if (error) return res.status(400).json({ success: false, message: error.message });
  res.status(200).json({ success: true, message: '삭제되었습니다.' });
};

// 🔹 댓글 추가
const addComment = async (req, res) => {
  const { postId, content } = req.body;
  const userUid = req.user.uid;

  const { data, error } = await supabase.from('post_comments').insert({
    post_id: postId,
    user_uid: userUid,
    content,
  }).select().single();

  if (error) return res.status(400).json({ success: false, message: error.message });
  res.status(201).json({ success: true, data });
};

// 🔹 댓글 삭제
const deleteComment = async (req, res) => {
  const { commentId, postId } = req.params;
  const userUid = req.user.uid;

  const { data: comment, error: fetchError } = await supabase
    .from('post_comments')
    .select('*')
    .eq('id', commentId)
    .single();

  if (fetchError || !comment) {
    return res.status(404).json({ success: false, message: '댓글을 찾을 수 없습니다.' });
  }

  if (comment.user_uid !== userUid) {
    return res.status(403).json({ success: false, message: '댓글 삭제 권한이 없습니다.' });
  }

  const { error: deleteError } = await supabase
    .from('post_comments')
    .delete()
    .eq('id', commentId);

  if (deleteError) {
    return res.status(400).json({ success: false, message: deleteError.message });
  }

  res.status(200).json({ success: true, message: '댓글이 삭제되었습니다.' });
};

// 🔹 댓글 목록 조회
const getComments = async (req, res) => {
  const { postId } = req.params;

  const { data, error } = await supabase.from('post_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) return res.status(400).json({ success: false, message: error.message });
  res.status(200).json({ success: true, data });
};

// 🔹 체크박스 상태 저장 또는 갱신
const updateCheckmark = async (req, res) => {
  const { postId, isChecked } = req.body;
  const userUid = req.user.uid;

  const { data, error } = await supabase.from('post_checkmarks').upsert({
    post_id: postId,
    user_uid: userUid,
    is_checked: isChecked,
    checked_at: new Date(),
  }, { onConflict: ['post_id', 'user_uid'] }).select().single();

  if (error) return res.status(400).json({ success: false, message: error.message });
  res.status(200).json({ success: true, data });
};

// 🔹 체크박스 상태 조회
const getCheckmark = async (req, res) => {
  const { postId } = req.params;
  const userUid = req.user.uid;

  const { data, error } = await supabase.from('post_checkmarks')
    .select('is_checked')
    .eq('post_id', postId)
    .eq('user_uid', userUid)
    .maybeSingle();

  if (error) return res.status(400).json({ success: false, message: error.message });
  res.status(200).json({ success: true, isChecked: data?.is_checked ?? false });
};

module.exports = {
  createPost,
  getPostsByGroup,
  updatePost,
  deletePost,
  addComment,
  deleteComment,
  getComments,
  updateCheckmark,
  getCheckmark,
  uploadImage, // 새로운 이미지 업로드 함수 추가
};