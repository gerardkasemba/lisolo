export default function PollOptionsPreview({ options }: {
  options: { text: string; image_url: string | null }[];
}) {
  return (
    <div className="flex flex-wrap gap-1 mb-3">
      {options.slice(0, 3).map((opt, idx) => (
        <span key={idx} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
          {opt.text}
        </span>
      ))}
      {options.length > 3 && (
        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
          +{options.length - 3} more
        </span>
      )}
    </div>
  );
}