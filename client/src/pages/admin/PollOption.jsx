export default function PollOption({ option, results, category, totalVotes }) {
  const optionResult = results?.find(r => r.option_selected === option);
  
  // For vote: show only count
  // For sondage: show only percentage
  const displayValue = category === "vote" 
    ? `${optionResult?.count || 0} vote${(optionResult?.count || 0) !== 1 ? 's' : ''}`
    : `${optionResult?.percentage || 0}%`;
  
  // Calculate percentage for progress bar
  // For vote: calculate from count and totalVotes
  // For sondage: use percentage from backend
  let percentage = 0;
  if (category === "vote") {
    const count = optionResult?.count || 0;
    percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
  } else {
    percentage = optionResult?.percentage || 0;
  }

  return (
    <div>
      <div className="mb-1 flex justify-between gap-3 text-sm font-medium text-slate-700">
        <span className="min-w-0 break-words">{option}</span>
        <span className="shrink-0">{displayValue}</span>
      </div>
      <div className="w-full bg-gray-200 h-2 rounded-full">
        <div
          className="h-2 rounded-full bg-blue-600 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

