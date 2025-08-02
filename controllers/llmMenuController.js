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
                text: `당신은 사장님이 입력한 키워드를 바탕으로, 알바생들에게 신메뉴를 효과적으로 전달하는 **공지사항의 제목과 본문**을 작성하는 역할입니다.

                    - 아래는 사장님이 작성한 키워드 또는 간단한 문장입니다.
                    - 제목은 간결하고 핵심을 담되, 매장 내부용 공지에 어울리게 작성해주세요.
                    - 본문은 정중하고 예의 바르며, 가독성이 좋아야 합니다.
                    - [이름], [매장 이름] 등의 대괄호나 템플릿 문자는 사용하지 마세요.
                    - 입력된 내용 외에 새로운 정보나 과장된 표현은 만들지 마세요.

                    입력된 내용:
                    ${input}

                    아래 형식에 맞게 작성해주세요:

                    제목: ...
                    본문: ...
                    `   

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
