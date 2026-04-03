import { useNavigate } from "react-router-dom";
import { ShieldOff, ArrowLeft } from "lucide-react";

export default function Unauthorized() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9fafb]">
      <div className="text-center max-w-sm px-6">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
          <ShieldOff className="w-7 h-7 text-red-400" />
        </div>
        <h1 className="text-lg font-medium text-[#111827] mb-2">Access Restricted</h1>
        <p className="text-sm text-[#6b7280] leading-relaxed mb-6">
          You don't have permission to view this page. Contact your project admin if you think this is a mistake.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#6c5ce7] text-white text-sm rounded-xl hover:bg-[#5a4bd1] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Go back
        </button>
      </div>
    </div>
  );
}
