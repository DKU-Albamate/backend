
const axios = require('axios');

exports.generateLLMNotice = async (req, res) => {
  const { input } = req.body;

  if (!input) {
    return res.status(400).json({ error: 'input is required' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];  // 오늘 날짜 (ex: 2025-07-29)

    const response = await axios.post(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + process.env.GEMINI_API_KEY,
    {
        contents: [{
        parts: [{
            text: `당신은 사장님이 입력한 키워드를 바탕으로, 알바생들에게 전달할 **안내사항 공지의 제목과 본문**을 정중하고 가독성 좋게 작성하는 역할입니다.
            오늘 날짜는 ${today}입니다.

            - 아래는 사장님이 입력한 키워드 또는 간단한 문장입니다.
            - 제목은 핵심 내용을 담아 간결하고 명확하게 작성해주세요.
            - 본문은 자연스럽고 정중한 문장으로 작성하고, 알바생이 내용을 쉽게 이해할 수 있어야 합니다.
            - 대괄호([이름], [매장 이름] 등)나 템플릿 문자는 사용하지 마세요.
            - 사람/장소 이름은 일반적인 표현으로 대체해주세요.
            - 키워드 외에 새로운 정보는 추가하지 말고, 전달받은 내용만 기반으로 작성해주세요.
            - 입력된 내용 외에 새로운 정보나 과장된 표현은 만들지 마세요.
            입력된 내용:
            ${input}

            아래 형식으로 작성해 주세요:

            제목: ...
            본문: ...
            `
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
