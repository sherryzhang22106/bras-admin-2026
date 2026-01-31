import { useState, useEffect } from 'react';
import { accessCodeApi } from '../services/api';

export default function AccessCodes() {
  const [codes, setCodes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('all');
  const [generating, setGenerating] = useState(false);
  const [count, setCount] = useState(10);
  const [lastBatchId, setLastBatchId] = useState<string | null>(null);
  const [lastGeneratedCount, setLastGeneratedCount] = useState(0);
  const limit = 20;

  useEffect(() => {
    loadData();
  }, [page, filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [codesRes, statsRes] = await Promise.all([
        accessCodeApi.list(page, limit, filter),
        accessCodeApi.stats(),
      ]);
      setCodes(codesRes.data.items);
      setTotal(codesRes.data.total);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (count < 1 || count > 100) {
      alert('请输入 1-100 之间的数量');
      return;
    }

    setGenerating(true);
    try {
      const response = await accessCodeApi.generate(count);
      const batchId = response.data.batchId;
      const generatedCount = response.data.count;
      
      setLastBatchId(batchId);
      setLastGeneratedCount(generatedCount);
      
      alert(`成功生成 ${generatedCount} 个兑换码`);
      setPage(1);
      loadData();
    } catch (error: any) {
      alert('生成失败: ' + (error.response?.data?.error || error.message));
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async () => {
    if (!lastBatchId) {
      alert('请先生成兑换码后再导出');
      return;
    }

    try {
      const response = await accessCodeApi.exportBatch(lastBatchId);
      
      // 创建Blob并下载
      const blob = new Blob([response.data], {
        type: 'text/csv;charset=utf-8'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `兑换码_${lastBatchId}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      alert(`已导出 ${lastGeneratedCount} 个兑换码`);
    } catch (error: any) {
      alert('导出失败: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div className="px-4 sm:px-0">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">兑换码管理</h1>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">总数</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{stats.total}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">可用</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{stats.available}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">已用</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{stats.used}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 生成兑换码 */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">生成兑换码</h2>
        <div className="flex items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">数量</label>
            <input
              type="number"
              min="1"
              max="100"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 1)}
              className="w-24 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {generating ? '生成中...' : '生成兑换码'}
          </button>
          <button
            onClick={handleExport}
            disabled={!lastBatchId}
            className={`px-6 py-2 text-white rounded-md flex items-center gap-2 ${
              lastBatchId 
                ? 'bg-cyan-500 hover:bg-cyan-600' 
                : 'bg-gray-300 cursor-not-allowed'
            }`}
            title={lastBatchId ? `导出刚生成的 ${lastGeneratedCount} 个兑换码` : '请先生成兑换码'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {lastBatchId ? `导出兑换码 (${lastGeneratedCount})` : '导出兑换码'}
          </button>
        </div>
      </div>

      {/* 筛选 */}
      <div className="bg-white shadow rounded-lg p-4 mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => { setFilter('all'); setPage(1); }}
            className={`px-4 py-2 rounded-md ${filter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            全部
          </button>
          <button
            onClick={() => { setFilter('available'); setPage(1); }}
            className={`px-4 py-2 rounded-md ${filter === 'available' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            可用
          </button>
          <button
            onClick={() => { setFilter('used'); setPage(1); }}
            className={`px-4 py-2 rounded-md ${filter === 'used' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            已用
          </button>
        </div>
      </div>

      {/* 兑换码列表 */}
      {loading ? (
        <div className="text-center py-12">加载中...</div>
      ) : (
        <>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">兑换码</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">批次</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">生成时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">使用时间</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {codes.map((code) => (
                  <tr key={code.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-primary-600">{code.code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        code.isUsed ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {code.isUsed ? '已使用' : '未使用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {code.batchId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(code.createdAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {code.usedAt ? new Date(code.usedAt).toLocaleString('zh-CN') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > limit && (
            <div className="mt-4 flex justify-between items-center">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                上一页
              </button>
              <span className="text-sm text-gray-700">
                第 {page} 页 / 共 {Math.ceil(total / limit)} 页
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / limit)}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
