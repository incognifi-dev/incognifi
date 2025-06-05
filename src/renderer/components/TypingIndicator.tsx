export function TypingIndicator() {
  return (
    <div className="flex space-x-1.5 px-3 py-1.5 bg-gray-900/50 rounded-lg max-w-fit">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 bg-violet-500/80 hover:bg-violet-400 rounded-full typing-dot"
        />
      ))}
    </div>
  );
}
