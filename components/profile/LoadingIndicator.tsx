export default function LoadingIndicator({ message = 'Loading...' }: {
  message?: string;
}) {
  return (
    <div className="flex justify-center items-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      <span className="ml-3">{message}</span>
    </div>
  );
}