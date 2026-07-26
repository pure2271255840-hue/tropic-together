"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function TripHomeError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-4 py-10">
      <Card className="w-full border-coral/30 bg-white">
        <CardContent className="flex flex-col items-start gap-5 p-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-coral/10 text-coral">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">旅行页面暂时没有加载成功</h1>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              本地开发服务可能刚刷新过。重新加载一次通常就能恢复。
            </p>
          </div>
          <Button onClick={reset}>重新加载</Button>
        </CardContent>
      </Card>
    </main>
  );
}
