
const axios = require('axios');

exports.generateLLMNotice = async (req, res) => {
  const { input } = req.body;

  if (!input) {
    return res.status(400).json({ error: 'input is required' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];  // 오늘 날짜 (ex: 2025-07-29)

    const response = await axios.post(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY,
    {
        contents: [{
        parts: [{
            text: `당신은 사장님이 입력한 키워드를 정중하고 가독성 좋게 공지사항 형태로 바꿔주는 역할입니다.
    오늘 날짜는 ${today}입니다.
    - 사장님이 아래 키워드 또는 간단한 문장을 입력했습니다
    - 사장님이 입력한 내용에 없는 정보를 새롭게 지어내지 마세요.
    - 공지사항은 정중하고 예의 바르게 작성되어야 합니다.
    - [이름], [매장 이름] 등 대괄호나 템플릿 표시는 사용하지 마세요. 
    - 문장은 자연스럽고 가독성이 좋아야 하며, 구체적인 사람/장소는 일반적인 표현으로 처리해주세요.
    - 이를 바탕으로 알바생이 잘 이해할 수 있도록 예의 바르고 가독성 높은 공지사항 문장으로 완성해 주세요.

    입력된 내용:
    ${input}

    위 내용을 참고하여, 알바생이 이해하기 쉬운 공지사항 **본문**을 정중하게 작성해주세요.`
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
