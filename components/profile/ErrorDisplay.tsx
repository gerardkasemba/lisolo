export default function ErrorDisplay({ error, onRetry }: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
      <p className="font-medium">Error loading polls</p>
      <p className="text-sm mt-1">{error}</p>
      <button
        onClick={onRetry}
        className="mt-2 text-sm bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/40 px-3 py-1 rounded"
      >
        Retry
      </button>
    </div>
  );
}