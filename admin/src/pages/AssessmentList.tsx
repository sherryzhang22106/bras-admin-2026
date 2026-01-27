import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { assessmentApi } from '../services/api';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export default function AssessmentList() {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    loadAssessments();
  }, [page]);

  const loadAssessments = async () => {
    setLoading(true);
    try {
      const response = await assessmentApi.list(page, limit);
      setAssessments(response.data.items);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to load assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGradeLabel = (grade: string) => {
    const labels: Record<string, string> = {
      'A': 'Excellent',
      'B': 'Good',
      'C': 'Average',
      'D': 'Below Average',
      'E': 'Fragile'
    };
    return labels[grade] || 'Unknown';
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/\//g, '/');
  };

  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadReport = async (assessment: any) => {
    if (!assessment.aiReport) return;
    
    setDownloading(assessment.id);

    // 创建隐藏的 HTML 容器用于渲染报告
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      left: -9999px;
      top: 0;
      width: 800px;
      background: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // 将 AI 报告内容按段落分割并格式化
    const reportParagraphs = (assessment.aiReport || '')
      .split('\n\n')
      .filter((p: string) => p.trim())
      .map((p: string) => `<p style="margin: 0 0 16px 0; line-height: 1.8; text-align: justify;">${p.replace(/\n/g, '<br>')}</p>`)
      .join('');

    // 解析 sections 数据
    const sections = typeof assessment.sections === 'string' 
      ? JSON.parse(assessment.sections) 
      : assessment.sections || {};
    
    // 各维度满分
    const maxScores = { base: 22, reason: 24, status: 25, conditions: 24, deep: 20 };
    const dimensionLabels = {
      base: '关系基础',
      reason: '分手原因',
      status: '当前状态',
      conditions: '挽回条件',
      deep: '深度评估'
    };

    // 生成雷达图 SVG
    const radarSize = 200;
    const radarCenter = radarSize / 2;
    const radarRadius = 70;
    const dimensions = ['base', 'reason', 'status', 'conditions', 'deep'];
    const angleStep = (2 * Math.PI) / 5;
    
    // 计算各维度百分比和坐标
    const radarPoints = dimensions.map((dim, i) => {
      const value = (sections[dim] || 0) / maxScores[dim as keyof typeof maxScores];
      const angle = i * angleStep - Math.PI / 2;
      const x = radarCenter + radarRadius * value * Math.cos(angle);
      const y = radarCenter + radarRadius * value * Math.sin(angle);
      return { x, y, value, dim };
    });
    
    const radarPath = radarPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
    
    // 生成背景网格
    const gridLevels = [0.2, 0.4, 0.6, 0.8, 1];
    const gridPaths = gridLevels.map(level => {
      const points = dimensions.map((_, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const x = radarCenter + radarRadius * level * Math.cos(angle);
        const y = radarCenter + radarRadius * level * Math.sin(angle);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ') + ' Z';
      return points;
    });

    // 生成维度标签位置
    const labelPositions = dimensions.map((dim, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const x = radarCenter + (radarRadius + 25) * Math.cos(angle);
      const y = radarCenter + (radarRadius + 25) * Math.sin(angle);
      return { x, y, label: dimensionLabels[dim as keyof typeof dimensionLabels] };
    });

    container.innerHTML = `
      <div style="padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100px;">
        <h1 style="color: white; font-size: 32px; margin: 0 0 8px 0; text-align: center; font-weight: 700;">AI 深度分析报告</h1>
        <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0; text-align: center;">BetterMe 情感分析团队</p>
      </div>
      
      <div style="padding: 40px 50px;">
        <!-- 核心指标区域 -->
        <div style="display: flex; gap: 20px; margin-bottom: 30px;">
          <!-- 左侧：雷达图 -->
          <div style="flex: 1.2; background: #f8fafc; border-radius: 16px; padding: 24px;">
            <h3 style="color: #1e293b; font-size: 14px; margin: 0 0 16px 0; font-weight: 600; display: flex; align-items: center;">
              <span style="width: 4px; height: 16px; background: #7c3aed; border-radius: 2px; margin-right: 8px;"></span>
              挽回潜力分布图
            </h3>
            <div style="display: flex; justify-content: center;">
              <svg width="${radarSize}" height="${radarSize}" viewBox="0 0 ${radarSize} ${radarSize}">
                <!-- 背景网格 -->
                ${gridPaths.map(path => `<path d="${path}" fill="none" stroke="#e2e8f0" stroke-width="1"/>`).join('')}
                <!-- 轴线 -->
                ${dimensions.map((_, i) => {
                  const angle = i * angleStep - Math.PI / 2;
                  const x = radarCenter + radarRadius * Math.cos(angle);
                  const y = radarCenter + radarRadius * Math.sin(angle);
                  return `<line x1="${radarCenter}" y1="${radarCenter}" x2="${x}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
                }).join('')}
                <!-- 数据区域 -->
                <path d="${radarPath}" fill="rgba(124, 58, 237, 0.2)" stroke="#7c3aed" stroke-width="2"/>
                <!-- 数据点 -->
                ${radarPoints.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#7c3aed"/>`).join('')}
                <!-- 标签 -->
                ${labelPositions.map(p => `<text x="${p.x}" y="${p.y}" text-anchor="middle" dominant-baseline="middle" font-size="11" fill="#64748b">${p.label}</text>`).join('')}
              </svg>
            </div>
          </div>
          
          <!-- 右侧：关键指标 -->
          <div style="flex: 0.8; display: flex; flex-direction: column; gap: 12px;">
            <!-- 挽回成功率 -->
            <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 12px; padding: 16px;">
              <p style="color: #991b1b; font-size: 10px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 1px;">挽回成功率</p>
              <p style="color: #dc2626; font-size: 28px; font-weight: 700; margin: 0;">${assessment.probability || '未知'}</p>
            </div>
            <!-- 对方当前态度 -->
            <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 16px;">
              <p style="color: #166534; font-size: 10px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 1px;">对方当前态度</p>
              <p style="color: #15803d; font-size: 20px; font-weight: 700; margin: 0;">${assessment.attitudeLevel || '未知'}</p>
            </div>
            <!-- 核心分手原因 -->
            <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 12px; padding: 16px;">
              <p style="color: #1e40af; font-size: 10px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 1px;">核心分手原因</p>
              <p style="color: #1d4ed8; font-size: 18px; font-weight: 700; margin: 0;">${assessment.reasonType || '未知'}</p>
            </div>
          </div>
        </div>

        <!-- 分维度评估 -->
        <div style="background: #f8fafc; border-radius: 16px; padding: 24px; margin-bottom: 30px;">
          <h3 style="color: #1e293b; font-size: 14px; margin: 0 0 20px 0; font-weight: 600; display: flex; align-items: center;">
            <span style="width: 4px; height: 16px; background: #7c3aed; border-radius: 2px; margin-right: 8px;"></span>
            分维度评估分析报告
          </h3>
          <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px;">
            ${dimensions.map(dim => {
              const score = sections[dim] || 0;
              const max = maxScores[dim as keyof typeof maxScores];
              const percent = Math.round((score / max) * 100);
              const label = dimensionLabels[dim as keyof typeof dimensionLabels];
              return `
                <div style="text-align: center;">
                  <p style="color: #64748b; font-size: 12px; margin: 0 0 8px 0;">${label}</p>
                  <div style="background: #e2e8f0; border-radius: 4px; height: 8px; overflow: hidden;">
                    <div style="background: linear-gradient(90deg, #7c3aed, #a78bfa); height: 100%; width: ${percent}%;"></div>
                  </div>
                  <p style="color: #7c3aed; font-size: 14px; font-weight: 600; margin: 8px 0 0 0;">${score} / ${max}</p>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 综合得分 -->
        <div style="display: flex; gap: 20px; margin-bottom: 30px;">
          <div style="flex: 1; background: #f8fafc; border-radius: 16px; padding: 24px;">
            <h3 style="color: #64748b; font-size: 12px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">基本信息</h3>
            <p style="margin: 8px 0; color: #334155; font-size: 14px;"><strong>兑换码：</strong>${assessment.accessCode || '未记录'}</p>
            <p style="margin: 8px 0; color: #334155; font-size: 14px;"><strong>评估时间：</strong>${formatDateTime(assessment.createdAt)}</p>
          </div>
          <div style="flex: 1; background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); border-radius: 16px; padding: 24px;">
            <h3 style="color: #7c3aed; font-size: 12px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">综合评估得分</h3>
            <div style="display: flex; align-items: baseline; gap: 4px;">
              <span style="font-size: 48px; font-weight: 700; color: #7c3aed;">${assessment.standardizedScore}</span>
              <span style="font-size: 18px; color: #a78bfa;">/100</span>
            </div>
            <p style="margin: 8px 0 0 0; color: #6d28d9; font-size: 14px;">评估等级: ${getGradeLabel(assessment.grade)} (${assessment.grade})</p>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 8px 0; font-weight: 700;">AI 深度分析报告</h2>
          <div style="width: 60px; height: 4px; background: linear-gradient(90deg, #7c3aed, #ec4899); border-radius: 2px;"></div>
        </div>

        <div style="color: #475569; font-size: 15px; line-height: 1.8;">
          ${reportParagraphs}
        </div>

        <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">BetterMe 情感分析团队 | 报告生成时间: ${new Date().toLocaleString('zh-CN')}</p>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    try {
      // 使用 html2canvas 将 HTML 转换为图片
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      // 创建 PDF
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // 计算图片在 PDF 中的尺寸
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // 添加第一页
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // 如果内容超过一页，添加更多页面
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // 下载 PDF
      const fileName = `AI报告_${assessment.accessCode || 'Report'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('PDF 生成失败，请重试');
    } finally {
      document.body.removeChild(container);
      setDownloading(null);
    }
  };

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  return (
    <div className="px-4 sm:px-0">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">所有测评记录</h1>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                评估ID
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                分数
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                类别
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                兑换码
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                AI报告
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                评估日期
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {assessments.map((assessment) => (
              <tr key={assessment.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link 
                    to={`/assessments/${assessment.id}`}
                    className="text-sm font-medium text-primary-600 hover:text-primary-800 font-mono"
                  >
                    {assessment.sessionId}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-lg font-bold text-purple-600">
                    {assessment.standardizedScore}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">
                    {getGradeLabel(assessment.grade)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900 font-mono">
                    {assessment.accessCode || '未记录'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {assessment.aiReport ? (
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/assessments/${assessment.id}`}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 transition-colors cursor-pointer"
                      >
                        查看报告
                      </Link>
                      <button
                        onClick={() => downloadReport(assessment)}
                        disabled={downloading === assessment.id}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                        title="下载报告给用户"
                      >
                        {downloading === assessment.id ? '生成中...' : '下载报告'}
                      </button>
                    </div>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                      未生成
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDateTime(assessment.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > limit && (
        <div className="mt-6 flex justify-between items-center">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          <span className="text-sm text-gray-700">
            第 {page} 页 / 共 {Math.ceil(total / limit)} 页
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / limit)}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
