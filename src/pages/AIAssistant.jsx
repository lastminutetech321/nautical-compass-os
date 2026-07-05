import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import PageHeader from "@/components/shared/PageHeader";

export default function AIAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    // Fetch context data for the AI
    let context = "";
    try {
      const [projects, orgs, tasks, team] = await Promise.all([
        base44.entities.Project.list("-created_date", 20),
        base44.entities.Organization.list("-created_date", 20),
        base44.entities.Task.list("-created_date", 30),
        base44.entities.TeamMember.list("-created_date", 20),
      ]);
      context = `Current Data Context:
- Projects (${projects.length}): ${projects.map(p => `${p.name} [${p.status}]`).join(", ")}
- Organizations (${orgs.length}): ${orgs.map(o => `${o.name} [${o.status}]`).join(", ")}
- Tasks (${tasks.length}): ${tasks.map(t => `${t.title} [${t.status}, ${t.priority}]`).join(", ")}
- Team Members (${team.length}): ${team.map(m => `${m.name} (${m.department})`).join(", ")}`;
    } catch (e) {
      context = "Unable to load current data context.";
    }

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are the Nautical Compass OS AI Assistant. You help with business operations, project management, and data analysis. Be concise, actionable, and professional. Use markdown for formatting.

${context}

User question: ${userMsg}`,
      });
      setMessages(prev => [...prev, { role: "assistant", content: response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "I'm sorry, I encountered an error. Please try again." }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = [
    "Summarize all active projects",
    "What tasks are overdue?",
    "Give me a team utilization overview",
    "Draft a project status update email",
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <PageHeader title="AI Assistant" subtitle="Ask anything about your business" />

      <Card className="flex-1 flex flex-col border border-border/60 overflow-hidden">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Nautical Compass AI</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                I have full context of your projects, tasks, clients, and team. Ask me anything.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(s)}
                    className="text-xs px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors border border-border/40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div className={`max-w-[70%] rounded-xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}>
                {msg.role === "assistant" ? (
                  <ReactMarkdown className="prose prose-sm max-w-none dark:prose-invert">{msg.content}</ReactMarkdown>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-muted rounded-xl px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border/60 p-4">
          <div className="flex items-end gap-3">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your projects, tasks, team..."
              rows={1}
              className="resize-none min-h-[40px] max-h-[120px] text-sm"
            />
            <Button onClick={handleSend} disabled={loading || !input.trim()} size="sm" className="h-10 w-10 p-0 flex-shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}