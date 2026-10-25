import { useState } from "react";
import {
  AlertTriangle,
  ShieldAlert,
  HeartPulse,
  TrendingDown,
  Scale,
  ChevronDown,
  ChevronUp,
  Info,
  X,
} from "lucide-react";

/**
 * Renders an official-style content advisory warning when a video is flagged
 * for unverified medical, financial, or legal assertions.
 *
 * @param {object} props
 * @param {object} props.advisory - { hasAdvisory, category, riskLevel, disclaimerTitle, disclaimerMessage }
 */
export default function ContentAdvisoryBanner({ advisory }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (!advisory || !advisory.hasAdvisory || isDismissed) {
    return null;
  }

  const category = (advisory.category || "none").toLowerCase();
  const risk = (advisory.riskLevel || "medium").toLowerCase();

  // Dynamic theme config per category and risk level
  const themeMap = {
    medical: {
      label: "Health & Medical Advisory",
      icon: HeartPulse,
      badgeColor: "bg-rose-100 text-rose-700 border-rose-300",
      containerBg: "bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 border-rose-300",
      accentIcon: "text-rose-600",
      titleColor: "text-rose-950",
      bodyColor: "text-rose-900/90",
      whyText:
        "The speaker makes authoritative health, diagnosis, or treatment claims. Orbit strongly urges viewers to consult licensed physicians or certified healthcare practitioners before modifying diets, stopping medications, or attempting treatments.",
    },
    financial: {
      label: "Financial & Investment Advisory",
      icon: TrendingDown,
      badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
      containerBg: "bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border-amber-300",
      accentIcon: "text-amber-600",
      titleColor: "text-amber-950",
      bodyColor: "text-amber-900/90",
      whyText:
        "The speaker presents investment advice or promises financial returns. Orbit advises viewers to perform independent due diligence and consult accredited financial advisors before making financial commitments.",
    },
    legal: {
      label: "Legal Information Notice",
      icon: Scale,
      badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
      containerBg: "bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border-blue-300",
      accentIcon: "text-blue-600",
      titleColor: "text-blue-950",
      bodyColor: "text-blue-900/90",
      whyText:
        "The content includes specific legal assertions that do not constitute professional legal counsel. Consult a qualified, licensed attorney in your jurisdiction for legal advice.",
    },
    default: {
      label: "Content Advisory",
      icon: AlertTriangle,
      badgeColor: "bg-yellow-100 text-yellow-800 border-yellow-300",
      containerBg: "bg-gradient-to-r from-yellow-50 via-amber-50 to-gray-50 border-yellow-300",
      accentIcon: "text-yellow-600",
      titleColor: "text-yellow-950",
      bodyColor: "text-yellow-900/90",
      whyText:
        "This video contains unverified claims that should be evaluated critically against accredited sources.",
    },
  };

  const currentTheme = themeMap[category] || themeMap.default;
  const CategoryIcon = currentTheme.icon;

  const defaultTitle =
    category === "medical"
      ? "Health Information Notice"
      : category === "financial"
      ? "Financial Advisory Notice"
      : category === "legal"
      ? "Legal Disclaimer"
      : "Content Advisory";

  const title = advisory.disclaimerTitle || defaultTitle;
  const message =
    advisory.disclaimerMessage ||
    "The speaker makes authoritative claims that are unverified. Orbit advises viewers to consult accredited professionals before taking action.";

  return (
    <div
      role="alert"
      className={`relative w-full rounded-xl border p-4 mb-4 shadow-sm transition-all animate-[cardIn_0.35s_ease-out] ${currentTheme.containerBg}`}
    >
      <div className="flex items-start gap-3">
        {/* Leading icon */}
        <div className="p-2 rounded-lg bg-white/80 shadow-xs flex-shrink-0 mt-0.5">
          <CategoryIcon className={`w-5 h-5 ${currentTheme.accentIcon}`} />
        </div>

        {/* Content body */}
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={`text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full border ${currentTheme.badgeColor}`}
            >
              {currentTheme.label}
            </span>

            {risk === "high" && (
              <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-red-600 text-white shadow-xs">
                High Caution
              </span>
            )}
          </div>

          <h3 className={`text-sm font-bold leading-tight ${currentTheme.titleColor}`}>
            {title}
          </h3>

          <p className={`text-xs mt-1 leading-relaxed ${currentTheme.bodyColor}`}>
            {message}
          </p>

          {/* Expandable Explanation */}
          <div className="mt-2">
            <button
              onClick={() => setIsExpanded((prev) => !prev)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-700 hover:text-black transition"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{isExpanded ? "Hide safety notice details" : "Why am I seeing this notice?"}</span>
              {isExpanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>

            {isExpanded && (
              <div className="mt-2 p-2.5 rounded-lg bg-white/70 border border-gray-200/70 text-xs text-gray-700 leading-relaxed animate-[fadeIn_0.2s_ease-out]">
                <p>{currentTheme.whyText}</p>
                <p className="mt-1.5 text-[11px] text-gray-500 font-medium">
                  Automated content safety inspection powered by Orbit AI • Llama 3.3
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Close / Dismiss */}
        <button
          onClick={() => setIsDismissed(true)}
          title="Dismiss advisory"
          className="absolute top-3 right-3 p-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-black/5 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
