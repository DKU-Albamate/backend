const axios = require('axios');

exports.generateLLMMenu = async (req, res) => {
  const { input } = req.body;

  if (!input) {
    return res.status(400).json({ error: 'input is required' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + process.env.GEMINI_API_KEY,
      {
        contents: [
          {
            parts: [
              {
                text: `당신은 사장님이 입력한 키워드를 바탕으로, 알바생들이 신메뉴에 대해 잘 이해하고 준비할 수 있도록 공지사항 본문을 작성하는 역할입니다.
                오늘 날짜는 ${today}입니다.

                - 아래는 사장님이 작성한 키워드 또는 간단한 문장입니다.
                - 이 내용을 바탕으로 신메뉴 제조 방법, 주의사항, 사은품 안내, 진열 위치 등 필요한 정보가 알바생에게 잘 전달되도록 공지사항 본문을 완성해주세요.
                - 문장은 정중하고 예의 바르며, 가독성이 좋아야 합니다.
                - [이름], [매장 이름] 등의 대괄호나 템플릿 문자는 사용하지 마세요.
                - 입력된 내용 외에 새로운 내용을 만들지 말고, 전달된 내용만 바탕으로 작성해주세요.

                입력된 내용:
                ${input}

                위 내용을 바탕으로 신메뉴 공지사항 **본문**을 작성해주세요.`

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

    const generated = response.data.candidates[0].content.parts[0].text.trim();
    res.json({ generated });

  } catch (err) {
    console.error('STATUS', err?.response?.status);
    console.error('DATA', err?.response?.data);
    console.error('MSG', err.message);
    res.status(500).json({ error: 'LLM generation failed' });
  }
};
