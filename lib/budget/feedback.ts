import { formatYen } from "@/lib/format";
import type { MonthlySummary, MonthlyBudget } from "./aggregate";

export type FeedbackTone = "celebrate" | "positive" | "warning" | "info";

export type Feedback = {
  tone: FeedbackTone;
  emoji: string;
  message: string;
};

/**
 * Friendly, non-judgmental feedback. Warnings (over budget) take priority;
 * otherwise we encourage. Sweets and convenience are called out first since
 * they're the app's focus.
 */
export function buildFeedback(
  summary: MonthlySummary,
  budget: MonthlyBudget | null,
): Feedback {
  const noTargets =
    !budget ||
    (budget.total_budget == null &&
      budget.sweets_budget == null &&
      budget.convenience_budget == null);

  if (noTargets) {
    return {
      tone: "info",
      emoji: "🎯",
      message:
        "予算を設定すると、使いすぎをやさしくお知らせします。設定から始めてみましょう。",
    };
  }

  if (
    budget!.sweets_budget != null &&
    summary.sweetsTotal > budget!.sweets_budget
  ) {
    const over = summary.sweetsTotal - budget!.sweets_budget;
    return {
      tone: "warning",
      emoji: "🍬",
      message: `お菓子が予算を ${formatYen(over)} オーバー。たまのご褒美は大事ですが、今週は少しお休みしてみては？`,
    };
  }

  if (
    budget!.convenience_budget != null &&
    summary.convenienceTotal > budget!.convenience_budget
  ) {
    const over = summary.convenienceTotal - budget!.convenience_budget;
    return {
      tone: "warning",
      emoji: "🏪",
      message: `コンビニ支出が予算を ${formatYen(over)} オーバー。まとめ買いに切り替えると節約できるかもしれません。`,
    };
  }

  if (
    budget!.total_budget != null &&
    summary.monthTotal > budget!.total_budget
  ) {
    const over = summary.monthTotal - budget!.total_budget;
    return {
      tone: "warning",
      emoji: "📊",
      message: `今月の支出が予算を ${formatYen(over)} オーバー。残りの日で無理なく調整していきましょう。`,
    };
  }

  if (budget!.total_budget != null && budget!.total_budget > 0) {
    const ratio = summary.monthTotal / budget!.total_budget;
    if (ratio <= 0.7) {
      return {
        tone: "celebrate",
        emoji: "🎉",
        message:
          "とてもいいペース！この調子なら今月も余裕を持って過ごせそうです。",
      };
    }
    return {
      tone: "positive",
      emoji: "👍",
      message: "予算内でやりくりできています。いい感じです！",
    };
  }

  return {
    tone: "positive",
    emoji: "👍",
    message: "順調です。引き続き記録していきましょう。",
  };
}
