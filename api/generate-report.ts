import type { VercelRequest, VercelResponse } from '@vercel/node';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-448ce19cde5643e7894695332072dd58';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { scores, answers, primaryType } = req.body;

    if (!scores) {
      return res.status(400).json({ error: '缺少评分数据' });
    }

    const prompt = buildPrompt(scores, answers, primaryType);

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一位专业的情感分析师和心理咨询师，擅长分析亲密关系问题并提供建设性的建议。请用温暖、专业且富有同理心的语气撰写报告。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('DeepSeek API error:', error);
      throw new Error('AI 服务暂时不可用');
    }

    const data = await response.json();
    const report = data.choices?.[0]?.message?.content || '报告生成失败，请稍后重试。';

    res.json({ report });
  } catch (error: any) {
    console.error('Generate report error:', error);
    res.status(500).json({ 
      error: error.message || '生成报告失败',
      report: '由于分析请求过于庞大，生成深度报告时遇到一点小麻烦。请您参考基础评估结果，或稍后尝试重新生成。'
    });
  }
}

function buildPrompt(scores: any, answers: any, primaryType: string): string {
  return `请根据以下"分手挽回可能性测评"结果，为用户撰写一份专业的深度分析报告。

## 测评结果数据

- 总分：${scores.total} 分
- 标准化得分：${scores.standardized} 分
- 等级：${scores.grade}
- 挽回概率：${scores.probability}
- 态度水平：${scores.attitudeLevel}
- 分手原因类型：${scores.reasonType || primaryType}

### 各维度得分
- 关系基础：${scores.sections?.base || 0} 分
- 分手原因：${scores.sections?.reason || 0} 分  
- 当前状态：${scores.sections?.status || 0} 分
- 外部条件：${scores.sections?.conditions || 0} 分
- 深层因素：${scores.sections?.deep || 0} 分

## 报告要求

请撰写一份2000字左右的深度分析报告，包含以下内容：

1. **开篇引言**（约200字）
   - 对用户当前处境表示理解和共情
   - 简述测评结果的整体情况

2. **关系诊断分析**（约500字）
   - 分析关系中的优势和问题点
   - 解读各维度得分的含义
   - 找出影响挽回的关键因素

3. **分手原因深度解析**（约400字）
   - 基于分手原因类型进行专业分析
   - 探讨表面原因和深层原因
   - 分析双方可能存在的认知偏差

4. **挽回可行性评估**（约300字）
   - 基于当前数据评估挽回的可能性
   - 分析有利因素和不利因素
   - 给出客观的预期管理建议

5. **行动指南**（约400字）
   - 提供具体可执行的建议
   - 分阶段的行动计划
   - 需要避免的常见错误

6. **结语寄语**（约200字）
   - 鼓励用户无论结果如何都要照顾好自己
   - 强调个人成长的重要性

请用温暖专业的语气撰写，避免过于学术化的表达。`;
}
