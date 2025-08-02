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
                    - 존댓말을 유지해주세요.
                    - 새로운 정보를 추가하지 마세요.
                    - 한 문단 이내로 요약해 주세요.

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
