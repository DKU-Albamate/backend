const { supabase } = require('../config/supabaseClient');

const ALLOWED_CATEGORIES = ['안내사항', '신메뉴공지', '대타구하기'];

// 🔹 글 작성
exports.createPost = async (req, res) => {
  const { groupId, title, content, category } = req.body;
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
  }).select().single();

  if (error) return res.status(400).json({ success: false, message: error.message });
  res.status(201).json({ success: true, data });
};

// 🔹 글 목록 조회 (groupId + optional category)
exports.getPostsByGroup = async (req, res) => {
  const { groupId, category } = req.query;

  let query = supabase.from('board_posts').select('*').eq('group_id', groupId);
  if (category) query = query.eq('category', category);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) return res.status(400).json({ success: false, message: error.message });
  res.status(200).json({ success: true, data });
};

// 🔹 글 수정
exports.updatePost = async (req, res) => {
  const { postId } = req.params;
  const { title, content } = req.body;
  const userUid = req.user.uid;

  const { data: post, error: fetchError } = await supabase.from('board_posts')
    .select('*').eq('id', postId).single();

  if (fetchError || !post)
    return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });

  const { data: roleData } = await supabase.from('group_members')
    .select('group_role').eq('group_id', post.group_id).eq('user_uid', userUid).single();

  const isAuthor = post.author_uid === userUid;
  const isBoss = roleData?.group_role === 'boss';

  if (!isAuthor && !isBoss) {
    return res.status(403).json({ success: false, message: '수정 권한이 없습니다.' });
  }

  const { error: updateError } = await supabase.from('board_posts')
    .update({ title, content, updated_at: new Date() })
    .eq('id', postId);

  if (updateError)
    return res.status(400).json({ success: false, message: updateError.message });

  res.status(200).json({ success: true, message: '수정되었습니다.' });
};

// 🔹 글 삭제
exports.deletePost = async (req, res) => {
  const { postId } = req.params;
  const userUid = req.user.uid;

  const { data: post, error: fetchError } = await supabase.from('board_posts')
    .select('*').eq('id', postId).single();

  if (fetchError || !post)
    return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });

  const { data: roleData } = await supabase.from('group_members')
    .select('group_role').eq('group_id', post.group_id).eq('user_uid', userUid).single();

  const isAuthor = post.author_uid === userUid;
  const isBoss = roleData?.group_role === 'boss';

  if (!isAuthor && !isBoss) {
    return res.status(403).json({ success: false, message: '삭제 권한이 없습니다.' });
  }

  const { error: deleteError } = await supabase.from('board_posts')
    .delete().eq('id', postId);

  if (deleteError)
    return res.status(400).json({ success: false, message: deleteError.message });

  res.status(200).json({ success: true, message: '삭제되었습니다.' });
};
