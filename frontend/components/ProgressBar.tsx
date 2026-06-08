interface ProgressBarProps {
  percent: number;
  className?: string;
}

export default function ProgressBar({ percent, className = "" }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className={`w-full bg-gray-100 rounded-full h-2 ${className}`}>
      <div
        className="h-2 rounded-full bg-indigo-500 transition-all duration-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
