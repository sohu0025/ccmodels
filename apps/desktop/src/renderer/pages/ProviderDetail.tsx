import { useParams } from 'react-router-dom';

export function ProviderDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">供应商详情</h2>
      <p className="text-secondary">供应商 ID: {id}</p>
    </div>
  );
}
