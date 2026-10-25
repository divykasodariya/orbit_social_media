import { useState } from "react";
import {
  AlertTriangle,
  HeartPulse,
  TrendingDown,
  Scale,
  FlaskConical,
  Zap,
  BookOpen,
  ShieldAlert,
  Leaf,
  Cpu,
  Vote,
  ChevronDown,
  ChevronUp,
  Info,
  X,
} from "lucide-react";

/**
 * Renders an official-style content advisory warning when a video is flagged
 * for unverified or potentially harmful authoritative claims.
 *
 * Supports all advisory categories returned by Orbit AI:
 * medical | financial | legal | pseudoscience | conspiracy |
 * spiritual_religious | nutrition_supplement | safety_security |
 * political_misinformation | environmental_misinformation
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

  // Theme config for every possible category
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
        "The speaker makes authoritative health, diagnosis, or treatment claims. Orbit strongly urges viewers to consult licensed physicians or certified healthcare practitioners before modifying diets, stopping medications, or attempting any treatments.",
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
        "The speaker presents investment advice or promises specific financial returns. Orbit advises viewers to perform independent due diligence and consult accredited financial advisors before making any financial commitments.",
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
        "The content includes specific legal assertions that do not constitute professional legal counsel. Consult a qualified, licensed attorney in your jurisdiction for advice specific to your situation.",
    },
    pseudoscience: {
      label: "Unverified Scientific Claims",
      icon: FlaskConical,
      badgeColor: "bg-purple-100 text-purple-800 border-purple-300",
      containerBg: "bg-gradient-to-r from-purple-50 via-violet-50 to-indigo-50 border-purple-300",
      accentIcon: "text-purple-600",
      titleColor: "text-purple-950",
      bodyColor: "text-purple-900/90",
      whyText:
        "This video contains claims that contradict established scientific consensus. Orbit recommends cross-referencing with peer-reviewed research or trusted scientific institutions before drawing conclusions.",
    },
    conspiracy: {
      label: "Unverified Conspiracy Claims",
      icon: ShieldAlert,
      badgeColor: "bg-orange-100 text-orange-800 border-orange-300",
      containerBg: "bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 border-orange-400",
      accentIcon: "text-orange-600",
      titleColor: "text-orange-950",
      bodyColor: "text-orange-900/90",
      whyText:
        "This video presents unverified conspiracy theories as established fact. These claims have not been independently corroborated. Orbit recommends consulting verified news sources and fact-checking services.",
    },
    spiritual_religious: {
      label: "Spiritual & Religious Advisory",
      icon: BookOpen,
      badgeColor: "bg-teal-100 text-teal-800 border-teal-300",
      containerBg: "bg-gradient-to-r from-teal-50 via-emerald-50 to-cyan-50 border-teal-300",
      accentIcon: "text-teal-600",
      titleColor: "text-teal-950",
      bodyColor: "text-teal-900/90",
      whyText:
        "The speaker makes authoritative spiritual or religious claims that could influence real-world health or safety decisions. Orbit advises viewers to consult licensed medical professionals for health matters and to make independent, informed decisions.",
    },
    nutrition_supplement: {
      label: "Nutrition & Supplement Advisory",
      icon: Leaf,
      badgeColor: "bg-green-100 text-green-800 border-green-300",
      containerBg: "bg-gradient-to-r from-green-50 via-emerald-50 to-lime-50 border-green-300",
      accentIcon: "text-green-600",
      titleColor: "text-green-950",
      bodyColor: "text-green-900/90",
      whyText:
        "This video promotes specific diets, supplements, or detox protocols with unverified medical claims. Consult a registered dietitian or healthcare professional before making dietary changes, especially if you have underlying health conditions.",
    },
    safety_security: {
      label: "Safety & Security Advisory",
      icon: Zap,
      badgeColor: "bg-red-100 text-red-800 border-red-300",
      containerBg: "bg-gradient-to-r from-red-50 via-rose-50 to-orange-50 border-red-300",
      accentIcon: "text-red-600",
      titleColor: "text-red-950",
      bodyColor: "text-red-900/90",
      whyText:
        "This content includes guidance that could pose physical or cybersecurity risks if followed incorrectly. Orbit advises viewers to consult certified professionals for safety-critical tasks and to verify instructions from authoritative technical sources.",
    },
    political_misinformation: {
      label: "Political Misinformation Notice",
      icon: Vote,
      badgeColor: "bg-sky-100 text-sky-800 border-sky-300",
      containerBg: "bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 border-sky-300",
      accentIcon: "text-sky-600",
      titleColor: "text-sky-950",
      bodyColor: "text-sky-900/90",
      whyText:
        "This video contains political statements or claims that have not been independently verified. Orbit recommends cross-referencing with established, non-partisan news sources and official government channels before forming opinions.",
    },
    environmental_misinformation: {
      label: "Environmental Claims Advisory",
      icon: Cpu,
      badgeColor: "bg-lime-100 text-lime-800 border-lime-300",
      containerBg: "bg-gradient-to-r from-lime-50 via-green-50 to-emerald-50 border-lime-300",
      accentIcon: "text-lime-700",
      titleColor: "text-lime-950",
      bodyColor: "text-lime-900/90",
      whyText:
        "This video contains environmental or climate-related assertions that contradict the established scientific consensus. Orbit recommends consulting peer-reviewed environmental research and reputable scientific institutions.",
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
        "This video contains unverified claims that should be evaluated critically against accredited sources before acting on them.",
    },
  };

  const currentTheme = themeMap[category] || themeMap.default;
  const CategoryIcon = currentTheme.icon;

  // Default fallback titles if LLM didn't provide one
  const defaultTitleMap = {
    medical: "Health Information Notice",
    financial: "Financial Advisory Notice",
    legal: "Legal Disclaimer",
    pseudoscience: "Unverified Scientific Claims",
    conspiracy: "Unverified Claims Advisory",
    spiritual_religious: "Spiritual Content Notice",
    nutrition_supplement: "Nutrition & Supplement Disclaimer",
    safety_security: "Safety Risk Advisory",
    political_misinformation: "Political Misinformation Notice",
    environmental_misinformation: "Environmental Claims Notice",
  };

  const title = advisory.disclaimerTitle || defaultTitleMap[category] || "Content Advisory";
  const message =
    advisory.disclaimerMessage ||
    "The speaker makes authoritative claims that are unverified. Orbit advises viewers to consult accredited professionals before taking any action.";

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
            {risk === "medium" && (
              <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-xs">
                Verify Before Acting
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
                  Automated content safety inspection powered by Orbit AI
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
