"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, ArrowLeft, Send, Loader2, User, Bot, AlertCircle } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const params = useParams();
  const fileId = Number(params.fileId);
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Find file name
  useEffect(() => {
    if (user?.files) {
      const file = user.files.find((f) => f.id === fileId);
      if (file) {
        setFileName(file.name);
      }
    }
  }, [user, fileId]);

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    const token = apiClient.getToken();
    if (!token) {
      setError("Not authenticated");
      setIsConnecting(false);
      return;
    }

    setIsConnecting(true);
    setError(null);

    const ws = new WebSocket(`ws://localhost:8080/chat?token=${token}`);

    ws.onopen = () => {
      console.log("[v0] WebSocket connected");
      setIsConnected(true);
      setIsConnecting(false);
    };

    ws.onmessage = (event) => {
      console.log("[v0] WebSocket message received:", event.data);
      const response = event.data;
      
      // Add assistant message
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: response,
        },
      ]);
      setIsSending(false);
    };

    ws.onerror = (event) => {
      console.log("[v0] WebSocket error:", event);
      setError("Connection error. Make sure the backend is running.");
      setIsConnecting(false);
      setIsSending(false);
    };

    ws.onclose = () => {
      console.log("[v0] WebSocket closed");
      setIsConnected(false);
      setIsConnecting(false);
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }

    if (!authLoading && isAuthenticated) {
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [authLoading, isAuthenticated, router, connectWebSocket]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || !wsRef.current || !isConnected || isSending) {
      return;
    }

    const message: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    // Add user message
    setMessages((prev) => [...prev, message]);
    setIsSending(true);

    // Send message via WebSocket
    const payload = {
      file_id: fileId,
      question: input.trim(),
    };
    
    console.log("[v0] Sending message:", payload);
    wsRef.current.send(JSON.stringify(payload));
    setInput("");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border shrink-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/profile"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </Link>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground block">
                    {fileName || `File #${fileId}`}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {isConnected ? "Connected" : isConnecting ? "Connecting..." : "Disconnected"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-500" : isConnecting ? "bg-yellow-500 animate-pulse" : "bg-red-500"
                }`}
              />
              <span className="text-xs text-muted-foreground">
                {isConnected ? "Online" : isConnecting ? "Connecting" : "Offline"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 flex flex-col max-w-5xl mx-auto w-full">
        <ScrollArea className="flex-1 p-4">
          {error && (
            <Card className="mb-4 p-4 bg-destructive/10 border-destructive/20">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={connectWebSocket}
                className="mt-2"
              >
                Retry Connection
              </Button>
            </Card>
          )}

          {messages.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center text-primary mb-4">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Start a conversation
              </h2>
              <p className="text-muted-foreground max-w-md">
                Ask questions about &quot;{fileName || `File #${fileId}`}&quot; and get AI-powered answers based on the document content.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5 text-primary-foreground" />
                  </div>
                )}
                <Card
                  className={`max-w-[80%] p-4 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border-border"
                  }`}
                >
                  <p className={message.role === "user" ? "text-primary-foreground" : "text-card-foreground"}>
                    {message.content}
                  </p>
                </Card>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}
            
            {isSending && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-primary-foreground" />
                </div>
                <Card className="p-4 bg-card border-border">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </Card>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-border p-4 shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isConnected ? "Type your question..." : "Connecting to server..."}
              disabled={!isConnected || isSending}
              className="flex-1 bg-input border-border text-foreground placeholder:text-muted-foreground"
            />
            <Button
              type="submit"
              disabled={!isConnected || isSending || !input.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
