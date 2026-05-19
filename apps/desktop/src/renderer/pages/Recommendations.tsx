import { useRecommendations } from '../hooks/useRecommendations';

export function Recommendations() {
  const { recommendations, loading, generate } = useRecommendations();

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">智能模型推荐</h2>
          <p className="text-sm text-text-secondary mt-1">根据历史用量自动推荐最优模型</p>
        </div>
        <button onClick={generate} className="btn-primary">生成推荐</button>
      </div>

      {/* Recommendations */}
      {recommendations.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-lg font-medium mb-1">还没有推荐记录</p>
          <p className="text-sm text-text-secondary">点击"生成推荐"开始分析您的使用模式</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-secondary/50">
                <th className="text-left px-5 py-3 font-semibold text-text-secondary">任务类型</th>
                <th className="text-left px-5 py-3 font-semibold text-text-secondary">推荐模型</th>
                <th className="text-left px-5 py-3 font-semibold text-text-secondary">推荐理由</th>
                <th className="text-right px-5 py-3 font-semibold text-text-secondary">使用次数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recommendations.map((r) => (
                <tr key={r.id} className="hover:bg-accent/5 transition-colors">
                  <td className="px-5 py-3 font-medium">{r.taskType}</td>
                  <td className="px-5 py-3">
                    <span className="badge badge-success">{r.recommendedModel}</span>
                  </td>
                  <td className="px-5 py-3 text-text-secondary text-xs">{r.reason}</td>
                  <td className="px-5 py-3 text-right font-mono">{r.usageCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
