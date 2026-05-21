import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 space-y-4">
          <div className="flex mb-2 gap-2 items-center">
            <AlertCircle className="h-8 w-8 text-red-500 flex-shrink-0" />
            <h1 className="text-2xl font-bold text-gray-900">404 — Page Not Found</h1>
          </div>
          <p className="text-sm text-gray-600">
            This page doesn't exist or may have moved.
          </p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => window.history.back()}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Go Back
            </Button>
            <Button size="sm" asChild>
              <Link href="/">
                <Home className="w-4 h-4 mr-1" /> Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
