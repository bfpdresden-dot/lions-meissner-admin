import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <AlertCircle className="h-16 w-16 text-gray-300" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
          <p className="text-lg font-medium text-gray-700 mb-1">Seite nicht gefunden</p>
          <p className="text-sm text-gray-500">
            Die angeforderte Seite existiert nicht oder wurde verschoben.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/veranstaltungen">
            <Button data-testid="link-back-events">Zu den Veranstaltungen</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
