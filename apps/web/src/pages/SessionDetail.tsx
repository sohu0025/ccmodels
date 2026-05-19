export function SessionDetail({ id }: { id: string }) {
  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-6">Session: {id}</h2>
      <p className="text-gray-500">Session messages will be displayed here.</p>
    </div>
  );
}
