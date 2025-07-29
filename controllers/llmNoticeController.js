
const axios = require('axios');

exports.generateLLMNotice = async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];  // 오늘 날짜 (ex: 2025-07-29)

    const response = await axios.post(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY,
    {
        contents: [{
        parts: [{
            text: `당신은 공지사항 문구를 정중하고 알기 쉽게 정리해주는 도우미입니다.
    오늘 날짜는 ${today}입니다.
    사장님이 아래 키워드 또는 간단한 문장을 입력했습니다. 
    이를 바탕으로 알바생이 잘 이해할 수 있도록 예의 바르고 가독성 높은 공지사항 문장으로 완성해 주세요.

    입력된 내용:
    ${prompt}

    공지사항 형식으로 예쁘게 정리해주세요.`
        }]
        }]
    },
    {
        headers: {
        'Content-Type': 'application/json',
        },
    }
    );


    const generated = response.data.candidates[0].content.parts[0].text.trim();
    res.json({ generated });

  } catch (err) {
    console.error('STATUS', err?.response?.status);
    console.error('DATA', err?.response?.data);
    console.error('MSG', err.message);
    res.status(500).json({ error: 'LLM generation failed' });
  }
};
