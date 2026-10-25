import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  ListOrdered,
  FileText,
  MessageSquare,
  Play,
  Search,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Copy,
  Check,
  Bot,
  User as UserIcon,
  Clock,
} from "lucide-react";
import { askVideoQuestion, triggerAnalysis, getVideoTranscriptSegments } from "../../api/ai.api";
import { useAuth } from "../../context/AuthContext";

/**
 * AiVideoHub
 * Complete AI workspace for a video:
 * 1. AI Summary & Key Takeaways
 * 2. Smart Chapters with 1-click seeking
 * 3. Interactive Searchable Transcript synchronized with playback
 * 4. RAG Video Copilot (Chatbot with clickable timestamp citations)
 *
 * @param {object} props
 * @param {object} props.video - The video object from getVideoById
 * @param {number} props.currentTime - Live playback time from <video> element
 * @param {function} props.onSeek - Callback to seek video player to a timestamp (in seconds)
 * @param {boolean} props.isOwner - Whether the current user is the video owner
 */
export default function AiVideoHub({ video, currentTime = 0, onSeek, isOwner = false }) {
  const { isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState("summary"); // "summary" | "chapters" | "transcript" | "chat"
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Analysis state (initialized from video prop, with refresh capabilities)
  const [analysis, setAnalysis] = useState(video?.aiAnalysis || {});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  // Transcript state
  const [segments, setSegments] = useState(video?.segments || []);
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  // Chat state
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm Orbit Copilot. Ask me anything about what's discussed in this video and I'll answer with clickable timestamps you can jump to.",
      citations: [],
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);
  const chatBottomRef = useRef(null);

  // Sync state if video prop updates
  useEffect(() => {
    if (video?.aiAnalysis) setAnalysis(video.aiAnalysis);
    if (video?.segments && video.segments.length > 0) {
      setSegments(video.segments);
    } else if (video?._id) {
      // Lazy fetch segments if not embedded
      getVideoTranscriptSegments(video._id)
        .then((res) => {
          if (res?.data?.data?.segments) {
            setSegments(res.data.data.segments);
          }
        })
        .catch(() => {});
    }
  }, [video?._id, video?.aiAnalysis, video?.segments]);

  // Auto-scroll chat to latest message
  useEffect(() => {
    if (activeTab === "chat") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab, isChatLoading]);

  // Handle manual analysis trigger (for owner or when pending)
  const handleTriggerAnalysis = async () => {
    if (!video?._id) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await triggerAnalysis(video._id);
      if (res?.data?.data) {
        setAnalysis({
          tldr: res.data.data.tldr,
          keyPoints: res.data.data.keyPoints,
          chapters: res.data.data.chapters,
          analysisStatus: "completed",
        });
      }
    } catch (err) {
      setAnalysisError(
        err?.response?.data?.message || "Failed to generate AI analysis. Ensure transcript is ready."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle chat submission
  const handleSendMessage = async (textToSend) => {
    const question = (textToSend || chatInput).trim();
    if (!question || isChatLoading) return;

    setChatError(null);
    const newHistory = [...messages, { role: "user", content: question }];
    setMessages(newHistory);
    setChatInput("");
    setIsChatLoading(true);

    try {
      // Send conversation history excluding system starter greeting
      const apiHistory = newHistory.slice(1, -1);
      const res = await askVideoQuestion(video._id, question, apiHistory);
      const data = res?.data?.data;

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data?.answer || "I processed your question.",
          citations: data?.citations || [],
        },
      ]);
    } catch (err) {
      setChatError(
        err?.response?.data?.message || "Failed to get AI response. Please try again."
      );
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I ran into an issue retrieving the answer. Please try again.",
          citations: [],
          isError: true,
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Format seconds to MM:SS
  const formatTime = (secs) => {
    const s = Math.max(0, Math.floor(secs || 0));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
  };

  // Find active chapter based on currentTime
  const chapters = analysis?.chapters || [];
  const currentChapterIndex = chapters.reduce((bestIdx, ch, idx) => {
    return currentTime >= ch.timestamp ? idx : bestIdx;
  }, -1);

  // Filter transcript segments by search term
  const filteredSegments = segments.filter((seg) =>
    seg.text.toLowerCase().includes(transcriptSearch.toLowerCase())
  );

  // Copy full transcript text
  const handleCopyTranscript = () => {
    const fullText = segments
      .map((s) => `[${formatTime(s.start)}] ${s.text}`)
      .join("\n");
    navigator.clipboard.writeText(fullText);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  // Render text containing [MM:SS] clickable timestamp pills
  const renderFormattedAnswer = (text, citations = []) => {
    if (!text) return null;

    // Regex to detect [MM:SS] or [HH:MM:SS] timestamps in text
    const timeRegex = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = timeRegex.exec(text)) !== null) {
      const start = match.index;
      const end = timeRegex.lastIndex;

      // Text before timestamp
      if (start > lastIndex) {
        parts.push(text.slice(lastIndex, start));
      }

      const timeStr = match[1];
      // Convert timeStr to seconds
      const timeParts = timeStr.split(":").map(Number);
      let seconds = 0;
      if (timeParts.length === 2) {
        seconds = timeParts[0] * 60 + timeParts[1];
      } else if (timeParts.length === 3) {
        seconds = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
      }

      parts.push(
        <button
          key={`ts-${start}`}
          onClick={() => onSeek && onSeek(seconds)}
          title={`Jump to ${timeStr}`}
          className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold text-xs transition active:scale-95 cursor-pointer"
        >
          <Play className="w-2.5 h-2.5 fill-blue-700" />
          {timeStr}
        </button>
      );

      lastIndex = end;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return (
      <div className="space-y-2">
        <div className="text-sm leading-relaxed whitespace-pre-line text-gray-800">
          {parts}
        </div>

        {/* Citations pill bar if citations are present */}
        {citations && citations.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-100 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-gray-500">Jump to moment:</span>
            {citations.map((c, cIdx) => (
              <button
                key={cIdx}
                onClick={() => onSeek && onSeek(c.timestamp)}
                className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
              >
                <Clock className="w-3 h-3 text-blue-600" />
                <span>{c.time}</span>
                {c.quote && (
                  <span className="text-gray-500 max-w-[140px] truncate">
                    • "{c.quote}"
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const starterPrompts = [
    "What is this video about?",
    "Give me the top 3 takeaways",
    "Summarize the conclusion",
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6 transition-all animate-[cardIn_0.35s_ease-out]">
      {/* ── HEADER / TAB SELECTOR ── */}
      <div className="p-3 sm:p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50/70 via-white to-gray-50/70">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Title & Badge */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                Orbit AI Intelligence
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  Groq AI
                </span>
              </h2>
            </div>
          </div>

          {/* Action buttons (Collapse toggle) */}
          <div className="flex items-center gap-1.5">
            {isOwner && analysis?.analysisStatus !== "completed" && (
              <button
                onClick={handleTriggerAnalysis}
                disabled={isAnalyzing}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
              >
                <RefreshCw className={`w-3 h-3 ${isAnalyzing ? "animate-spin" : ""}`} />
                {isAnalyzing ? "Analyzing..." : "Analyze Video"}
              </button>
            )}

            <button
              onClick={() => setIsCollapsed((prev) => !prev)}
              title={isCollapsed ? "Expand AI Hub" : "Collapse AI Hub"}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
            >
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* TAB BUTTONS (Visible when not collapsed) */}
        {!isCollapsed && (
          <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setActiveTab("summary")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === "summary"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Summary & Insights
            </button>

            <button
              onClick={() => setActiveTab("chapters")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === "chapters"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              Chapters {chapters.length > 0 && `(${chapters.length})`}
            </button>

            <button
              onClick={() => setActiveTab("transcript")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === "transcript"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Interactive Transcript
            </button>

            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === "chat"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Ask Copilot
            </button>
          </div>
        )}
      </div>

      {/* ── BODY CONTENT ── */}
      {!isCollapsed && (
        <div className="p-4">
          {/* Error Banner */}
          {analysisError && (
            <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {analysisError}
            </div>
          )}

          {/* ════════ TAB 1: SUMMARY & INSIGHTS ════════ */}
          {activeTab === "summary" && (
            <div className="space-y-4 animate-[fadeIn_0.25s_ease-out]">
              {analysis?.tldr ? (
                <>
                  {/* TL;DR Box */}
                  <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 mb-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      Executive Summary (TL;DR)
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed">
                      {analysis.tldr}
                    </p>
                  </div>

                  {/* Key Takeaways */}
                  {analysis?.keyPoints && analysis.keyPoints.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                        Key Takeaways
                      </h3>
                      <ul className="space-y-2">
                        {analysis.keyPoints.map((point, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-800 bg-gray-50 p-2.5 rounded-lg border border-gray-100"
                          >
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px] font-bold mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="leading-snug">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                /* Pending / Processing State */
                <div className="py-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    {isAnalyzing ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Sparkles className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">
                      {isAnalyzing
                        ? "AI is analyzing this video..."
                        : video?.transcription_status === "failed"
                        ? "Transcription was interrupted"
                        : video?.transcription_status === "processing" || video?.transcription_status === "pending"
                        ? "Transcription is processing in background..."
                        : "AI Summary not generated yet"}
                    </h3>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                      {isAnalyzing
                        ? "AI is reading the transcript and distilling summaries, chapters, and key points."
                        : video?.transcription_status === "failed"
                        ? (video?.transcription_error || "The transcription was interrupted. Click below to retry.")
                        : "Once audio transcription finishes, AI will automatically summarize and extract chapters."}
                    </p>
                  </div>
                  {isOwner && !isAnalyzing && (
                    <button
                      onClick={handleTriggerAnalysis}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition active:scale-95"
                    >
                      {video?.transcription_status === "failed" ? "Retry Processing & AI Analysis" : "Generate AI Summary Now"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ════════ TAB 2: SMART CHAPTERS ════════ */}
          {activeTab === "chapters" && (
            <div className="animate-[fadeIn_0.25s_ease-out]">
              {chapters.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-500 mb-2">
                    Click any chapter to jump the player to that timestamp:
                  </p>
                  {chapters.map((ch, idx) => {
                    const isActive = currentChapterIndex === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => onSeek && onSeek(ch.timestamp)}
                        className={`w-full text-left flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                          isActive
                            ? "bg-blue-50 border-blue-300 shadow-xs"
                            : "bg-white hover:bg-gray-50 border-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`flex-shrink-0 text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                              isActive
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {ch.formattedTime || formatTime(ch.timestamp)}
                          </span>
                          <span
                            className={`text-xs sm:text-sm truncate font-medium ${
                              isActive ? "text-blue-900 font-semibold" : "text-gray-800"
                            }`}
                          >
                            {ch.title}
                          </span>
                        </div>

                        {isActive && (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 flex-shrink-0 pl-2">
                            <Play className="w-3 h-3 fill-blue-600" />
                            Playing
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-gray-500">
                  No chapters generated yet. Chapters will appear after AI analysis completes.
                </div>
              )}
            </div>
          )}

          {/* ════════ TAB 3: INTERACTIVE TRANSCRIPT ════════ */}
          {activeTab === "transcript" && (
            <div className="animate-[fadeIn_0.25s_ease-out] space-y-3">
              {/* Search & Actions Bar */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={transcriptSearch}
                    onChange={(e) => setTranscriptSearch(e.target.value)}
                    placeholder="Search transcript..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {segments.length > 0 && (
                  <button
                    onClick={handleCopyTranscript}
                    title="Copy full transcript"
                    className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 hover:bg-gray-50 transition"
                  >
                    {copiedTranscript ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Segments Stream */}
              {segments.length > 0 ? (
                <div className="max-h-72 overflow-y-auto space-y-1 pr-1 border rounded-xl p-2 bg-gray-50/50">
                  {filteredSegments.map((seg, idx) => {
                    const isSpeaking =
                      currentTime >= seg.start && currentTime <= (seg.end || seg.start + 5);

                    return (
                      <div
                        key={idx}
                        onClick={() => onSeek && onSeek(seg.start)}
                        className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition text-xs ${
                          isSpeaking
                            ? "bg-blue-100/70 border border-blue-200 text-blue-950 font-medium"
                            : "hover:bg-white text-gray-700"
                        }`}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSeek && onSeek(seg.start);
                          }}
                          className={`flex-shrink-0 text-[11px] font-mono px-1.5 py-0.5 rounded transition ${
                            isSpeaking
                              ? "bg-blue-600 text-white font-bold"
                              : "bg-gray-200 text-gray-600 hover:bg-blue-600 hover:text-white"
                          }`}
                        >
                          {formatTime(seg.start)}
                        </button>
                        <p className="flex-1 leading-relaxed">{seg.text}</p>
                      </div>
                    );
                  })}

                  {filteredSegments.length === 0 && (
                    <div className="py-6 text-center text-xs text-gray-500">
                      No matching lines found for "{transcriptSearch}"
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-gray-500">
                  Transcript not available yet or currently generating.
                </div>
              )}
            </div>
          )}

          {/* ════════ TAB 4: RAG VIDEO COPILOT CHATBOT ════════ */}
          {activeTab === "chat" && (
            <div className="animate-[fadeIn_0.25s_ease-out] flex flex-col h-[380px]">
              {/* Starter Prompt Chips */}
              <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1 no-scrollbar">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex-shrink-0">
                  Try:
                </span>
                {starterPrompts.map((prompt, pIdx) => (
                  <button
                    key={pIdx}
                    onClick={() => handleSendMessage(prompt)}
                    disabled={isChatLoading}
                    className="flex-shrink-0 text-xs px-2.5 py-1 rounded-full bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-700 transition"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Chat Message List */}
              <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-gray-50/70 rounded-xl border border-gray-100">
                {messages.map((msg, idx) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
                          isUser
                            ? "bg-blue-600 text-white"
                            : "bg-white border border-gray-200 text-blue-600 shadow-xs"
                        }`}
                      >
                        {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>

                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm shadow-xs ${
                          isUser
                            ? "bg-blue-600 text-white rounded-tr-none"
                            : "bg-white text-gray-800 border border-gray-200/80 rounded-tl-none"
                        }`}
                      >
                        {isUser ? (
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          renderFormattedAnswer(msg.content, msg.citations)
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Loading indicator */}
                {isChatLoading && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-white border border-gray-200 text-blue-600 flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-2.5 text-xs text-gray-500 flex items-center gap-2 shadow-xs">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      Thinking and searching video transcript...
                    </div>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Chat Error */}
              {chatError && (
                <p className="text-[11px] text-red-600 px-1 pt-1">{chatError}</p>
              )}

              {/* Chat Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="mt-2.5 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={
                    isAuthenticated
                      ? "Ask any question about this video..."
                      : "Please sign in to ask questions"
                  }
                  disabled={!isAuthenticated || isChatLoading}
                  className="flex-1 px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />

                <button
                  type="submit"
                  disabled={!isAuthenticated || !chatInput.trim() || isChatLoading}
                  className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition active:scale-95 flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
