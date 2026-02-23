import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    const redirect = setTimeout(() => {
      // Try to go back, otherwise go home
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate("/");
      }
    }, 5000);

    return () => {
      clearInterval(timer);
      clearTimeout(redirect);
    };
  }, [location.pathname, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8F9FB] p-4 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 animate-ping rounded-full bg-red-100 opacity-20"></div>
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-xl shadow-red-100/50">
          <AlertCircle className="h-12 w-12 text-destructive" strokeWidth={1.5} />
        </div>
      </div>

      <div className="max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1 className="aeonik mb-2 text-6xl font-medium tracking-tight text-[#1B1C1F]">404</h1>
        <h2 className="mb-4 text-xl font-medium text-[#4B5563]">Page Not Found</h2>
        <p className="mb-8 leading-relaxed text-[#6B7280]">
          The workspace you're looking for doesn't exist or has been moved.
          We'll automatically return you to safer ground in <span className="font-medium text-primary tabular-nums">{countdown}</span> seconds.
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="group w-full border-[#E5E7EB] hover:bg-gray-50 sm:w-auto"
          >
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Go Back
          </Button>
          <Button
            onClick={() => navigate("/")}
            className="w-full bg-[#1B1C1F] hover:bg-[#2D2E32] sm:w-auto"
          >
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </div>
      </div>

      {/* Decorative pulse */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]"></div>
        <div className="absolute -bottom-1/4 -right-1/4 h-[500px] w-[500px] rounded-full bg-blue-500/5 blur-[120px]"></div>
      </div>
    </div>
  );
};

export default NotFound;
