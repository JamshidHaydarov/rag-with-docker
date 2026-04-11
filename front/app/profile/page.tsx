"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, LogOut, FileText, MessageSquare, Loader2, FolderOpen } from "lucide-react";

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-semibold text-foreground">RAG AI</span>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Welcome, <span className="text-foreground font-medium">{user.username}</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Your Files</h1>
          <p className="mt-2 text-muted-foreground">
            Select a file to start chatting with AI about its contents
          </p>
        </div>

        {user.files && user.files.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {user.files.map((file) => (
              <Link key={file.id} href={`/chat/${file.id}`}>
                <Card className="bg-card border-border hover:border-primary/50 transition-all cursor-pointer group h-full">
                  <CardHeader className="pb-3">
                    <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center text-primary mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <FileText className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-lg text-card-foreground truncate">
                      {file.name}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Click to chat with AI
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <MessageSquare className="w-4 h-4" />
                      <span>Start conversation</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground mb-4">
                <FolderOpen className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-2">No files yet</h3>
              <p className="text-muted-foreground text-center max-w-md">
                You don&apos;t have any files uploaded. Upload files through the backend to start chatting with AI about them.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
