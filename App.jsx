import { useState, useEffect, useRef } from "react";
import { Amplify } from 'aws-amplify';
import { fetchAuthSession, signOut as amplifySignOut } from 'aws-amplify/auth';
import { Authenticator, ThemeProvider } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

// Clear storage in incognito on load

const API_BASE_URL = "https://wcfyp2mg2m.ap-south-1.awsapprunner.com";
//const API_BASE_URL = "http://localhost:8000";


function clearIncognitoStorage() {
  try {
    const test = '__test__';
    sessionStorage.setItem(test, test);
    sessionStorage.removeItem(test);
  } catch(e) {
    // Incognito mode detected - clear everything
    localStorage.clear();
    sessionStorage.clear();
    amplifySignOut({ global: true }).catch(() => {});
  }
}

clearIncognitoStorage();

Amplify.configure({
  Auth: { 
    Cognito: { 
      userPoolId: 'ap-south-1_Gxqe821u8', 
      userPoolClientId: '1ounaicr2v4u4iu8a7ri8ktmjt', 
      loginWith: { email: true } 
    } 
  }
});

const customTheme = {
  name: "customTheme",
  tokens: {
    colors: {
      brand: {
        primary: { 10: "#f0fdf4", 20: "#dcfce7", 40: "#86efac", 60: "#22c55e", 80: "#16a34a", 90: "#15803d", 100: "#10b981" },
        secondary: { 10: "#f8fafc", 20: "#f1f5f9", 40: "#cbd5e1", 60: "#94a3b8", 80: "#475569", 90: "#334155", 100: "#1e293b" },
      },
      font: { interactive: "#10b981" },
      border: { primary: "#334155", secondary: "#475569" },
    },
    radii: { small: "8px", medium: "10px", large: "12px", xl: "16px" },
  },
  overrides: [
    { selector: "[data-amplify-authenticator]", style: { background: "linear-gradient(135deg, #0f172a 0%, #1a202c 100%)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" } },
    { selector: "[data-amplify-authenticator-container]", style: { background: "rgba(15, 23, 42, 0.95)", backdropFilter: "blur(20px)", border: "1px solid rgba(51, 65, 85, 0.3)", borderRadius: "16px", boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)", maxWidth: "420px", width: "100%", padding: "48px 32px" } },
    { selector: "input, textarea, select", style: { background: "rgba(30, 41, 59, 0.6)", border: "1.5px solid rgba(51, 65, 85, 0.3)", borderRadius: "8px", color: "#e2e8f0", fontSize: "14px", fontWeight: "500", padding: "12px 14px", transition: "all 0.2s ease" } },
    { selector: "input:focus, textarea:focus, select:focus", style: { borderColor: "rgba(16, 185, 129, 0.5)", background: "rgba(30, 41, 59, 0.8)", outline: "none" } },
    { selector: "button[type='submit']", style: { background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "#064e3b", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "600", padding: "12px 16px", cursor: "pointer", transition: "all 0.2s ease", boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)", width: "100%" } },
    { selector: "button[type='submit']:hover", style: { boxShadow: "0 6px 20px rgba(16, 185, 129, 0.4)", transform: "translateY(-2px)" } },
    { selector: "[data-amplify-heading]", style: { color: "#e2e8f0", fontSize: "24px", fontWeight: "600" } },
    { selector: "[data-amplify-label]", style: { color: "#94a3b8", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" } },
  ],
};

export default function App() {
  return (
    <ThemeProvider theme={customTheme}>
      <Authenticator 
        socialChannels={[]}
        components={{
          Header() {
            return (
              <div style={{ textAlign: "center", marginBottom: "40px" }}>
                <div style={{ fontSize: "42px", fontWeight: "700", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "12px", letterSpacing: "-0.02em" }}>NEXUS</div>
                <div style={{ fontSize: "14px", color: "#94a3b8", fontWeight: "500", letterSpacing: "0.05em", textTransform: "uppercase" }}>AI Assistant</div>
              </div>
            );
          }
        }}
      >
        {({ signOut, user }) => <ChatInterface user={user} signOut={signOut} />}
      </Authenticator>
    </ThemeProvider>
  );
}

function ChatInterface({ user, signOut }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [threads, setThreads] = useState([]);
  const [threadPreviews, setThreadPreviews] = useState({});
  const [activeId, setActiveId] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const chatEnd = useRef(null);

  const userEmail = user?.signInDetails?.loginId || user?.username || "User";

  const getHeaders = async () => {
    const session = await fetchAuthSession();
    const token = session.tokens.idToken.toString();
    return { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
  };

  const switchThread = async (threadId) => {
    setActiveId(threadId);
    setMessages([]);
    const h = await getHeaders();
    const res = await fetch(`${API_BASE_URL}/history/${threadId}`, { headers: h });
    const data = await res.json();
    setMessages(data.history || []);
  };

  useEffect(() => {
    const init = async () => {
      const h = await getHeaders();
      const res = await fetch(`${API_BASE_URL}/threads`, { headers: h });
      const data = await res.json();
      
      if (data.threads && data.threads.length > 0) {
        setThreads(data.threads);
        switchThread(data.threads[0].id);
        for (const thread of data.threads) {
          const previewRes = await fetch(`${API_BASE_URL}/thread-preview/${thread.id}`, { headers: h });
          const previewData = await previewRes.json();
          setThreadPreviews(prev => ({ ...prev, [thread.id]: previewData.preview }));
        }
      } else {
        const newId = `chat_${Date.now()}`;
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const date = String(now.getDate()).padStart(2, '0');
        const year = String(now.getFullYear()).slice(-2);
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const threadName = `trd1-${month}/${date}/${year} ${hours}:${minutes}:${seconds}`;
        setActiveId(newId);
        setMessages([]);
        setThreads([{ id: newId, name: threadName }]);
        setThreadPreviews({ [newId]: "New chat" });
      }
    };
    init();
  }, []);

  const onNewChat = async () => {
    const newId = `chat_${Date.now()}`;
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const threadName = `trd${threads.length + 1}-${month}/${date}/${year} ${hours}:${minutes}:${seconds}`;
    
    setActiveId(newId);
    setMessages([]);
    setThreads(prev => [{ id: newId, name: threadName }, ...prev]);
    setThreadPreviews(prev => ({ [newId]: "New chat", ...prev }));
  };

  const onSend = async () => {
    if (!input.trim() || loading) return;
    
    const currentInput = input;
    const currentId = activeId;
    
    setMessages(prev => [...prev, { role: "user", text: currentInput }]);
    setInput("");
    setLoading(true);
    
    if (messages.length === 0) {
      setThreadPreviews(prev => ({ ...prev, [currentId]: currentInput }));
    }
    
    try {
      const h = await getHeaders();
      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: h,
        body: JSON.stringify({ message: currentInput, thread_id: currentId })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "ai", text: data.bot_response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "ai", text: "Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #1a202c 100%)", color: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", overflow: "hidden" }}>
      <aside style={{ width: sidebarOpen ? "280px" : "0", background: "rgba(15, 23, 42, 0.95)", backdropFilter: "blur(10px)", padding: sidebarOpen ? "24px" : "0", display: "flex", flexDirection: "column", borderRight: "1px solid rgba(51, 65, 85, 0.3)", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", overflow: "hidden" }}>
        <div style={{ marginBottom: "24px", padding: "16px", background: "rgba(30, 41, 59, 0.6)", borderRadius: "12px", border: "1px solid rgba(51, 65, 85, 0.4)", backdropFilter: "blur(8px)" }}>
          <div style={{ fontSize: "11px", fontWeight: "600", color: "#94a3b8", letterSpacing: "0.05em", marginBottom: "8px" }}>LOGGED IN</div>
          <div style={{ fontSize: "14px", fontWeight: "500", color: "#10b981", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userEmail}</div>
        </div>

        <button onClick={onNewChat} style={{ width: "100%", padding: "12px 16px", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "#064e3b", border: "none", borderRadius: "10px", fontWeight: "600", fontSize: "15px", cursor: "pointer", marginBottom: "24px", transition: "all 0.2s ease", boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)", position: "relative", overflow: "hidden" }} onMouseEnter={(e) => e.target.style.boxShadow = "0 6px 20px rgba(16, 185, 129, 0.4)"} onMouseLeave={(e) => e.target.style.boxShadow = "0 4px 15px rgba(16, 185, 129, 0.3)"}> ✕ New Chat </button>

        <div style={{ flex: 1, overflowY: "auto", marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", letterSpacing: "0.05em", marginBottom: "12px", textTransform: "uppercase" }}>Chat History</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {threads.map(thread => (
              <div key={thread.id} onClick={() => switchThread(thread.id)} style={{ padding: "12px 14px", cursor: "pointer", borderRadius: "8px", background: activeId === thread.id ? "rgba(16, 185, 129, 0.15)" : "transparent", color: activeId === thread.id ? "#10b981" : "#cbd5e1", border: activeId === thread.id ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid transparent", fontSize: "13px", fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", transition: "all 0.2s ease" }} onMouseEnter={(e) => { if (activeId !== thread.id) { e.target.style.background = "rgba(51, 65, 85, 0.2)"; e.target.style.color = "#e2e8f0"; } }} onMouseLeave={(e) => { if (activeId !== thread.id) { e.target.style.background = "transparent"; e.target.style.color = "#cbd5e1"; } }} title={threadPreviews[thread.id] || "chat"}> {thread.name || `chat_${thread.id.slice(-5)}`} </div>
            ))}
          </div>
        </div>

        <button onClick={signOut} style={{ width: "100%", padding: "12px 16px", color: "#f87171", background: "transparent", border: "1.5px solid rgba(244, 63, 94, 0.3)", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px", transition: "all 0.2s ease" }} onMouseEnter={(e) => { e.target.style.background = "rgba(244, 63, 94, 0.1)"; e.target.style.borderColor = "rgba(244, 63, 94, 0.5)"; }} onMouseLeave={(e) => { e.target.style.background = "transparent"; e.target.style.borderColor = "rgba(244, 63, 94, 0.3)"; }}> Sign Out </button>
      </aside>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", padding: "32px", position: "relative", overflow: "hidden" }}>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ position: "fixed", top: "24px", left: sidebarOpen ? "300px" : "24px", width: "40px", height: "40px", borderRadius: "10px", border: "1px solid rgba(51, 65, 85, 0.5)", background: "rgba(30, 41, 59, 0.8)", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s ease", fontSize: "18px", zIndex: 100 }} onMouseEnter={(e) => { e.target.style.background = "rgba(51, 65, 85, 0.6)"; e.target.style.color = "#cbd5e1"; }} onMouseLeave={(e) => { e.target.style.background = "rgba(30, 41, 59, 0.8)"; e.target.style.color = "#94a3b8"; }}> {sidebarOpen ? "‹" : "›"} </button>

        <div style={{ flex: 1, overflowY: "auto", marginTop: "48px", marginBottom: "24px", display: "flex", flexDirection: "column", gap: "16px", paddingRight: "8px" }}>
          {messages.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#64748b", textAlign: "center", gap: "16px" }}>
              <div style={{ fontSize: "48px", opacity: "0.5" }}>💬</div>
              <div><div style={{ fontSize: "18px", fontWeight: "600", color: "#94a3b8", marginBottom: "8px" }}>No messages yet</div><div style={{ fontSize: "14px", color: "#64748b" }}>Start a conversation to begin</div></div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", animation: `fadeIn 0.3s ease-out` }}>
              <div style={{ padding: "12px 16px", borderRadius: "12px", maxWidth: "70%", wordWrap: "break-word", background: m.role === "user" ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "rgba(30, 41, 59, 0.8)", color: m.role === "user" ? "#064e3b" : "#e2e8f0", fontSize: "15px", lineHeight: "1.5", fontWeight: "500", boxShadow: m.role === "user" ? "0 4px 15px rgba(16, 185, 129, 0.2)" : "0 2px 8px rgba(0, 0, 0, 0.1)", border: m.role === "user" ? "none" : "1px solid rgba(51, 65, 85, 0.3)" }}> {m.text} </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: "8px", padding: "16px", alignItems: "center" }}>
              <div style={{ fontSize: "14px", color: "#94a3b8" }}>AI is thinking</div>
              <div style={{ display: "flex", gap: "4px" }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", animation: `bounce 1.4s infinite`, animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={chatEnd} />
        </div>

        <div style={{ display: "flex", gap: "12px", paddingRight: "8px" }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), onSend())} disabled={loading} style={{ flex: 1, padding: "14px 18px", borderRadius: "10px", background: "rgba(30, 41, 59, 0.8)", color: "#e2e8f0", border: "1.5px solid rgba(51, 65, 85, 0.3)", fontSize: "15px", fontWeight: "500", fontFamily: "inherit", transition: "all 0.2s ease", outline: "none" }} onFocus={(e) => e.target.style.borderColor = "rgba(16, 185, 129, 0.5)"} onBlur={(e) => e.target.style.borderColor = "rgba(51, 65, 85, 0.3)"} placeholder="Type a message..." />
          <button onClick={onSend} disabled={loading || !input.trim()} style={{ background: loading || !input.trim() ? "rgba(16, 185, 129, 0.4)" : "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "#064e3b", padding: "14px 28px", borderRadius: "10px", border: "none", cursor: loading || !input.trim() ? "not-allowed" : "pointer", fontWeight: "600", fontSize: "15px", transition: "all 0.2s ease", boxShadow: loading || !input.trim() ? "none" : "0 4px 15px rgba(16, 185, 129, 0.3)", whiteSpace: "nowrap" }} onMouseEnter={(e) => { if (!loading && input.trim()) { e.target.style.boxShadow = "0 6px 20px rgba(16, 185, 129, 0.4)"; } }} onMouseLeave={(e) => { if (!loading && input.trim()) { e.target.style.boxShadow = "0 4px 15px rgba(16, 185, 129, 0.3)"; } }}> {loading ? "..." : "Send"} </button>
        </div>
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(1); opacity: 0.6; } 40% { transform: scale(1.2); opacity: 1; } }
        aside::-webkit-scrollbar { width: 6px; }
        aside::-webkit-scrollbar-track { background: transparent; }
        aside::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 3px; }
        aside::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.5); }
        main::-webkit-scrollbar { width: 6px; }
        main::-webkit-scrollbar-track { background: transparent; }
        main::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 3px; }
        main::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.5); }
        input::placeholder { color: #64748b; }
        input:disabled { opacity: 0.6; }
      `}</style>
    </div>
  );
}