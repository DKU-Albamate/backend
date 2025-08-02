const axios = require('axios');

exports.summarizeLLMContent = async (req, res) => {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'content is required' });
  }

  try {
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + process.env.GEMINI_API_KEY,
      {
        contents: [
          {
            parts: [
              {
                text: `다음 글을 알바생이 빠르게 이해할 수 있도록 핵심만 간결하게 요약해 주세요.
                    - 아래 본문에서 알바생이 꼭 알아야 할 핵심 정보만 간결하게 요약해주세요.
                    - 인사말(예: 안녕하세요, 감사합니다 등)이나 불필요한 예의 표현은 모두 제거해주세요.
                    - 새로운 내용을 추가하지 말고, 본문에 있는 내용만 바탕으로 작성하세요.
                    - 한 문단 이내로 요약해주세요.
                    - 존댓말은 유지하되, 정보 전달 위주로 간결하게 써주세요.

                    본문:
                    ${content}`
              }
            ]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const summary = response.data.candidates[0].content.parts[0].text.trim();
    res.json({ summary });

  } catch (err) {
    console.error('STATUS', err?.response?.status);
    console.error('DATA', err?.response?.data);
    console.error('MSG', err.message);
    res.status(500).json({ error: 'LLM summary generation failed' });
  }
};
