import type { VercelRequest, VercelResponse } from '@vercel/node';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-448ce19cde5643e7894695332072dd58';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// 报告部分类型
type ReportPart = 'part1' | 'part2';

// 上篇摘要信息（用于下篇生成）
interface Part1Summary {
  grade: string;
  probability: string;
  reasonType: string;
  mainAdvantages: string;
  mainDisadvantages: string;
  partnerPsychology: string;
}

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
    const { scores, answers, primaryType, part, part1Summary } = req.body;

    if (!scores) {
      return res.status(400).json({ error: '缺少评分数据' });
    }

    // 根据 part 参数选择不同的提示词
    const reportPart: ReportPart = part || 'part1';
    let prompt: string;

    if (reportPart === 'part2') {
      if (!part1Summary) {
        return res.status(400).json({ error: '生成下篇需要上篇摘要信息' });
      }
      prompt = buildPromptPart2(scores, answers, primaryType, part1Summary);
    } else {
      prompt = buildPromptPart1(scores, answers, primaryType);
    }

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
            content: '你是一位专业的情感分析师和心理咨询师，擅长分析亲密关系问题并提供建设性的建议。请用温暖、专业且富有同理心的语气撰写报告。输出时不要使用#和*符号作为标题或强调，改用数字编号和文字描述。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 5000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('DeepSeek API error:', error);
      throw new Error('AI 服务暂时不可用');
    }

    const data = await response.json();
    let report = data.choices?.[0]?.message?.content || '报告生成失败，请稍后重试。';

    // 只有下篇添加固定结尾
    if (reportPart === 'part2') {
      report += getFixedEnding();
    }

    res.json({ report, part: reportPart });
  } catch (error: any) {
    console.error('Generate report error:', error);
    res.status(500).json({
      error: error.message || '生成报告失败',
      report: '由于分析请求过于庞大，生成深度报告时遇到一点小麻烦。请您参考基础评估结果，或稍后尝试重新生成。'
    });
  }
}

function getFixedEnding(): string {
  return `

————————————————————————————

亲爱的朋友：

无论这份报告的结果如何，我们都希望你明白：

挽回的本质不是"把对方追回来"，而是"成为更好的自己"。

如果最终你们能复合，那是因为你们真的解决了问题，建立了更健康的关系模式。

如果最终无法挽回，你也会因为这段经历成长，在下一段关系中做得更好。

所以，无论结果如何，你都不会白白付出。

我们不会告诉你"只要照做就一定能成功"，因为感情从来不是数学题。

但我们可以保证：这份报告基于心理学原理和大量真实案例，能最大限度提高你的成功率。

最重要的是：请对自己好一点。

你值得被爱，无论是被对方爱，还是被未来的人爱，还是被你自己爱。

加油！

—— BetterMe Space Station情感分析团队


特别声明

✅ 本测评基于心理学理论和真实案例数据
✅ 建议仅供参考，不构成绝对结论
✅ 每段关系都有其独特性，请结合实际情况判断
✅ 如涉及心理健康问题，请寻求专业心理咨询`;
}

// 上篇提示词（Part 1）- 关系现状、分手原因、对方心理分析
function buildPromptPart1(scores: any, answers: any, primaryType: string): string {
  // 构建答案摘要
  let answersSummary = '';
  if (answers && typeof answers === 'object') {
    const answerEntries = Object.entries(answers);
    if (answerEntries.length > 0) {
      answersSummary = '用户的部分关键答案：\n';
      answerEntries.slice(0, 20).forEach(([qId, answer]: [string, any]) => {
        if (answer && answer.text) {
          answersSummary += `- 问题${qId}: ${answer.text}\n`;
        }
      });
    }
  }

  return `请根据以下"分手挽回可能性测评"结果，生成深度分析报告的【上篇】。

【测评结果数据】

总分：${scores.total || 0} 分
标准化得分：${scores.standardized || 0} 分
等级：${scores.grade || '未知'}
挽回概率：${scores.probability || '未知'}
态度水平：${scores.attitudeLevel || '未知'}
分手原因类型：${scores.reasonType || primaryType || '未知'}

各维度得分：
- 关系基础：${scores.sections?.base || 0} 分
- 分手原因：${scores.sections?.reason || 0} 分
- 当前状态：${scores.sections?.status || 0} 分
- 外部条件：${scores.sections?.conditions || 0} 分
- 深层因素：${scores.sections?.deep || 0} 分

${answersSummary}

【上篇报告生成要求】

请生成约2500-3500字的深度报告上篇，包含以下部分：

1. 开场白（200字左右）
- 用温暖的语气与用户建立连接
- 简要概括TA的情况
- 给予初步的情绪支持
- 说明这份报告将如何帮助TA

示例开场白风格：
"看完你的答案，我能感受到你现在的心情——既想挽回这段感情，又担心努力会白费。这种矛盾和焦虑，每个经历分手的人都懂。
好消息是，根据你们的情况，你并非没有机会。你们有深厚的感情基础，分手的原因也是可以改变的。
但我必须诚实地告诉你：挽回不是靠纠缠和哀求，而是需要真正的改变和正确的策略。
接下来，我会用最真诚的态度，帮你分析清楚：你们到底出了什么问题？对方现在是什么心理状态？你应该怎么做？
深呼吸，我们一起面对。"

2. 关系深度解读（1500字左右）

2.1 你们的感情基础分析
- 根据交往时长、关系质量等，分析感情的真实深度
- 指出哪些是真正的情感连接，哪些可能只是习惯
- 分析双方的付出与收获是否平衡
- 评估这段关系的"不可替代性"

2.2 相处模式诊断
- 根据矛盾处理方式、争吵频率等，诊断相处模式
- 指出哪些模式是健康的，哪些是破坏性的
- 分析依恋风格的匹配度
- 说明这些模式如何一步步导致分手

2.3 外部支持系统评估
- 分析双方家庭、朋友对关系的态度
- 评估外部压力的影响程度
- 说明如何争取或利用外部支持

3. 分手原因深层剖析（2000字左右）

3.1 表面原因 vs 深层原因
- 对方说的分手理由
- 真正的核心问题是什么（用心理学视角解读）
- 为什么TA会用模糊的理由搪塞
- 举例说明：如果表面是"沟通问题"，深层可能是"情感需求长期未被满足"

3.2 你在关系中的问题
- 诚实但温和地指出用户的具体问题
- 用具体例子说明这些行为如何伤害了关系
- 解释这些问题背后的心理机制
- 重要：不是指责，而是帮助理解

3.3 对方在关系中的问题
- 客观分析对方的问题
- 说明哪些是对方需要成长的地方
- 避免让用户产生"都是TA的错"的想法
- 强调：即使对方有问题，挽回也要从自己的改变开始

3.4 问题的可解决性分析
- 每个问题逐一分析：是否可以改变？如何改变？
- 如果存在难以解决的根本性冲突，要明确指出
- 给出改变的可行性评估

4. 对方心理状态深度分析（1500字左右）

4.1 当前心理状态解读
- 根据对方的具体行为，分析心理状态
- 解释每个行为背后的心理含义
- 评估对方的"情感残留度"

4.2 对方可能的内心戏
- 用第一人称的方式，模拟对方现在可能的想法
- 帮助用户理解对方的视角

4.3 对方的决心程度判断
- 是冲动分手还是深思熟虑？
- 回心转意的可能性有多大？
- 哪些信号表明对方在观望，哪些表明已经决裂？

4.4 对方最希望看到你的什么改变
- 基于分手原因，推测对方最在意什么
- 具体列出3-5项对方可能期待的改变
- 说明为什么这些改变对对方很重要

5. 你的优势与劣势（1000字左右）

5.1 挽回优势详解
- 逐条展开你的优势，不只是列举
- 每个优势说明：为什么这是优势？如何利用？

5.2 挽回劣势详解
- 诚实面对劣势，不回避
- 每个劣势说明：为什么这是劣势？如何规避或转化？

5.3 与对方的竞争力对比
- 真正的吸引力不只是条件，还有情感价值

【上篇结尾】
在报告最后，请添加以下衔接语：

"以上是对你们关系现状的深度分析。在下篇中，我将为你制定详细的阶段性行动方案，包括30天行动清单、风险提示与红线、以及无论结果如何你都会收获的成长指南。请继续阅读下篇，获取完整的挽回策略。"

【输出要求】

1. 语言风格：
- 第一视角：多用"你"而非"用户"
- 温暖但不油腻：像朋友聊天，但保持专业
- 共情但理性：理解TA的痛苦，但给出客观建议
- 避免空话套话：每一句话都要有信息量

2. 格式要求：
- 不要使用#号作为标题
- 不要使用*号作为强调
- 使用数字编号（如1. 2. 3.）作为标题层级
- 重点内容用【】或「」突出
- 适当使用emoji增加亲和力（但不要过度）

3. 内容要求：
- 总字数2500-3500字
- 每个部分都要有足够的深度
- 如果分数很低，必须诚实告知，不要给虚假希望

4. 个性化要求：
- 必须基于用户的具体情况，而非通用模板
- 根据分数高低调整语气：
  - 80分以上：鼓励和信心为主
  - 50-79分：理性分析，强调方法的重要性
  - 30-49分：诚实面对难度，探讨是否值得
  - 30分以下：温和但坚定地建议考虑放手

5. 道德要求：
- 不鼓励纠缠、跟踪等不道德行为
- 如果关系有毒，明确建议离开
- 尊重对方的决定和感受

请现在开始生成上篇报告，注意不要使用#和*符号。`;
}

// 下篇提示词（Part 2）- 行动方案、风险提示、成长指南
function buildPromptPart2(scores: any, answers: any, primaryType: string, part1Summary: Part1Summary): string {
  return `请根据以下"分手挽回可能性测评"结果和上篇分析摘要，生成深度分析报告的【下篇】。

【测评结果数据】

总分：${scores.total || 0} 分
标准化得分：${scores.standardized || 0} 分
等级：${scores.grade || '未知'}（${part1Summary.grade}）
挽回概率：${scores.probability || '未知'}（${part1Summary.probability}）
分手原因类型：${scores.reasonType || primaryType || '未知'}（${part1Summary.reasonType}）

【上篇分析摘要】

核心分手原因：${part1Summary.reasonType}
用户主要优势：${part1Summary.mainAdvantages}
用户主要劣势：${part1Summary.mainDisadvantages}
对方当前心理状态：${part1Summary.partnerPsychology}

【下篇开头】
请以以下衔接语开头：

"基于上篇对你们关系的深度分析，现在为你制定具体的行动方案。记住，挽回不是一蹴而就的事情，需要耐心和正确的策略。"

【下篇报告生成要求】

请生成约2500-3500字的深度报告下篇，包含以下部分：

6. 阶段性行动方案（2000字左右，这是核心部分）

6.1 当前阶段判定
- 明确说明用户处于哪个阶段（断联期/二次吸引期/关系重建期）
- 为什么是这个阶段？判定依据是什么？
- 这个阶段的核心目标是什么？

6.2 详细行动计划
根据用户所处阶段，给出具体的行动指南：
- 断联期：为什么必须断联、断联的具体要求、断联期间要做什么、何时可以结束断联
- 二次吸引期：自我提升计划（外在30%、内在40%、生活状态30%）、展示改变的策略、轻度试探的时机和方式
- 关系重建期：见面邀约技巧、互动技巧、重建信任的步骤、关系升温的节奏

6.3 30天详细行动清单
用表格形式，列出未来30天每一周的具体行动，包括：具体要做什么、为什么要做、如何衡量完成、预期效果

6.4 可能遇到的问题及应对
列出8-10个常见问题，每个给出详细应对方案

7. 风险提示与红线（800字左右）

7.1 高风险行为警示
- 列出10条绝对不能做的事
- 每一条说明：为什么不能做？做了会有什么后果？如果已经做过，如何补救？

7.2 时间底线设定
- 挽回不是无限期的，建议设定3-6个月的期限
- 到期后如何评估？如果到期无进展，如何优雅放手？

7.3 心理健康监测
- 列出需要寻求专业帮助的信号
- 推荐资源

8. 是否值得挽回的深层思考（1000字左右）

8.1 三个灵魂拷问
引导用户思考：
1. 去除"不甘心"，你是真的爱TA吗？
2. 如果复合，你们能避免重蹈覆辙吗？
3. 这段关系让你成长了，还是消耗了你？

8.2 什么情况下应该放弃
- 明确列出应该放弃的情况
- 语气温和，不是指责

8.3 放手也是一种爱
- 如果评分很低或有严重问题，这部分要重点写
- 分享"放手后反而过得更好"的案例

9. 无论结果如何，你都会成长（500字左右）
- 挽回成功的情况
- 挽回失败的情况
- 成长型思维

10. 结束语（300字左右）
- 总结全文要点
- 再次给予情感支持和鼓励
- 温暖的结尾

【输出要求】

1. 语言风格：
- 第一视角：多用"你"而非"用户"
- 温暖但不油腻：像朋友聊天，但保持专业
- 共情但理性：理解TA的痛苦，但给出客观建议
- 避免空话套话：每一句话都要有信息量

2. 格式要求：
- 不要使用#号作为标题
- 不要使用*号作为强调
- 使用数字编号（如6. 7. 8.）作为标题层级（延续上篇编号）
- 重点内容用【】或「」突出
- 适当使用emoji增加亲和力（但不要过度）

3. 内容要求：
- 总字数2500-3500字
- 每个部分都要有足够的深度
- 给出的建议必须可执行
- 话术模板要真实可用，不是套路和PUA
- 如果分数很低，必须诚实告知，不要给虚假希望

4. 个性化要求：
- 必须基于用户的具体情况和上篇分析，而非通用模板
- 根据分数高低调整语气：
  - 80分以上：鼓励和信心为主
  - 50-79分：理性分析，强调方法的重要性
  - 30-49分：诚实面对难度，探讨是否值得
  - 30分以下：温和但坚定地建议考虑放手

5. 道德要求：
- 不鼓励纠缠、跟踪等不道德行为
- 不提供PUA话术和情感操控技巧
- 如果关系有毒，明确建议离开
- 尊重对方的决定和感受

【特殊情况处理】

如果得分<20分（E级）：
- 重点放在"为什么不建议挽回"和"如何走出来"
- 篇幅分配：60%放在疗愈和放手，40%放在挽回策略

如果存在原则性问题（出轨、暴力）：
- 必须明确建议不要挽回
- 重点写如何保护自己、如何疗愈

请现在开始生成下篇报告，注意不要使用#和*符号。`;
}
