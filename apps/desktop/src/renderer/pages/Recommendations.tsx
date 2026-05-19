import { useRecommendations } from '../hooks/useRecommendations';

export function Recommendations() {
  const { recommendations, loading, generate } = useRecommendations();

  if (loading) return <div className="p-8 text-text-secondary">Loading...</div>;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">智能模型推荐</h2>
          <p className="text-sm text-text-secondary mt-1">根据历史用量自动推荐最优模型</p>
        </div>
        <button onClick={generate}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm">生成推荐</button>
      </div>

      <div className="space-y-3">
        {recommendations.length === 0 ? (
          <p className="text-sm text-text-secondary py-8 text-center">还没有推荐记录，点击"生成推荐"开始分析</p>
        ) : (
          <div className="bg-white rounded-xl border border-border p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2">任务类型</th>
                  <th className="text-left">推荐模型</th>
                  <th className="text-left">推荐理由</th>
                  <th className="text-right">使用次数</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.map(r => (
                  <tr key={r.id} className="border-b border-border">
                    <td className="py-2 font-medium">{r.taskType}</td>
                    <td className="py-2">{r.recommendedModel}</td>
                    <td className="py-2 text-text-secondary text-xs">{r.reason}</td>
                    <td className="py-2 text-right">{r.usageCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
