import type { Feedback } from "@/lib/budget/feedback";

const TONE_CLASS: Record<Feedback["tone"], string> = {
  celebrate: "bg-emerald-50 text-emerald-800 border-emerald-200",
  positive: "bg-sky-50 text-sky-800 border-sky-200",
  warning: "bg-amber-50 text-amber-900 border-amber-200",
  info: "bg-slate-50 text-slate-700 border-slate-200",
};

export function FeedbackBanner({ feedback }: { feedback: Feedback }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-4 ${TONE_CLASS[feedback.tone]}`}
    >
      <span className="text-xl leading-none">{feedback.emoji}</span>
      <p className="text-sm">{feedback.message}</p>
    </div>
  );
}
