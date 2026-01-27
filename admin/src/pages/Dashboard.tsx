import { useState, useEffect } from 'react';
import { assessmentApi, accessCodeApi } from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [codeStats, setCodeStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [assessmentRes, codeRes] = await Promise.all([
        assessmentApi.stats(),
        accessCodeApi.stats(),
      ]);
      setStats(assessmentRes.data);
      setCodeStats(codeRes.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  return (
    <div className="px-4 sm:px-0">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">数据概览</h1>
      
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">测评总数</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{stats?.total || 0}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">平均分数</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{stats?.avgScore || 0}</div>
                  </dd>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">可用兑换码</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{codeStats?.available || 0}</div>
                  </dd>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">已用兑换码</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{codeStats?.used || 0}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {stats?.trend && (
        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">📊 30天测评趋势</h2>
            <div className="text-sm text-gray-500">
              最近14天总计: <span className="font-semibold text-primary-600">
                {stats.trend.slice(-14).reduce((sum: number, item: any) => sum + item.count, 0)}
              </span>
            </div>
          </div>
          
          <div className="relative">
            {/* 柱状图 */}
            <div className="flex items-end justify-between space-x-1 h-64 border-b border-gray-200">
              {stats.trend.map((item: any) => {
                const maxCount = Math.max(...stats.trend.map((d: any) => d.count), 1);
                const height = (item.count / maxCount) * 100;
                const isToday = new Date(item.date).toDateString() === new Date().toDateString();
                
                return (
                  <div 
                    key={item.date} 
                    className="flex-1 flex flex-col items-center justify-end group relative"
                  >
                    {/* 柱子 */}
                    <div 
                      className={`w-full rounded-t transition-all duration-300 ${
                        isToday 
                          ? 'bg-gradient-to-t from-pink-500 to-purple-600' 
                          : 'bg-gradient-to-t from-pink-400 to-purple-500 hover:from-pink-500 hover:to-purple-600'
                      }`}
                      style={{ height: `${height}%`, minHeight: item.count > 0 ? '4px' : '0px' }}
                    />
                    
                    {/* 悬浮提示 */}
                    {item.count > 0 && (
                      <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                        {item.date.slice(5)}: {item.count}条
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* X轴日期标签 - 只显示部分日期 */}
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              {stats.trend.map((item: any, index: number) => {
                // 每隔5天显示一次日期，最后一天也显示
                const shouldShow = index % 5 === 0 || index === stats.trend.length - 1;
                return (
                  <div key={item.date} className="flex-1 text-center">
                    {shouldShow && <span>{item.date.slice(5)}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {stats?.gradeDistribution && (
        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">等级分布</h2>
          <div className="space-y-3">
            {Object.entries(stats.gradeDistribution).map(([grade, count]: [string, any]) => (
              <div key={grade} className="flex items-center">
                <span className="w-12 text-sm font-medium text-gray-700">{grade} 级</span>
                <div className="flex-1 ml-4">
                  <div className="bg-gray-200 rounded-full h-6">
                    <div
                      className="bg-primary-600 h-6 rounded-full flex items-center justify-center text-xs text-white font-medium"
                      style={{ width: `${(count / stats.total) * 100}%` }}
                    >
                      {count}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
