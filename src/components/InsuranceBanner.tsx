import { Shield, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';

/**
 * Persistent banner shown on the Dashboard when a professional user
 * has no current insurance certificate on file, or has one that's
 * expired / expiring within 30 days.
 *
 * Per client meeting 23 Apr (Darren Ogden): insurance uploads are
 * taken out of onboarding and surfaced here instead.
 *
 * Visibility rules (client-side; a proper `has_current_insurance` on
 * the user API would clean this up — see
 * docs/DOCUMENTS_BACKEND_CHANGES_NEEDED.md §6):
 *
 *   - Hide if user has no `role` (likely a client, not a professional)
 *   - Show `missing` variant if no insurance_document / no s3_key
 *   - Show `expired` variant if expiry_date is in the past
 *   - Show `expiring` variant if expiry_date is within 30 days
 *
 * Not dismissible — by design it should reappear every visit until
 * resolved. Clicking "Upload" takes the user to /documents/upload with
 * the fields pre-filled for an insurance certificate.
 */
export const InsuranceBanner = () => {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();

  // Non-professionals: never show.
  if (!user) return null;
  if (!user.role) return null;

  const ins = user.insurance_document;
  const hasUpload = !!ins?.s3_key;
  const expiryStr = ins?.expiry_date ?? null;

  let variant: 'missing' | 'expired' | 'expiring' | null = null;
  let daysUntilExpiry: number | null = null;

  if (!hasUpload) {
    variant = 'missing';
  } else if (expiryStr) {
    const expiry = new Date(expiryStr);
    const now = new Date();
    const diffDays = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) variant = 'expired';
    else if (diffDays <= 30) {
      variant = 'expiring';
      daysUntilExpiry = diffDays;
    }
  }

  if (!variant) return null;

  const config = {
    missing: {
      tone: 'amber',
      title: 'Upload your professional insurance certificate',
      body:
        'Required for consultants. Keeps your record compliant and visible to project owners.',
      cta: 'Upload now',
    },
    expired: {
      tone: 'red',
      title: 'Your professional insurance has expired',
      body:
        'Please upload a current insurance certificate so you remain compliant on your active projects.',
      cta: 'Upload renewed cert',
    },
    expiring: {
      tone: 'amber',
      title: `Your insurance expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`,
      body:
        'Upload a renewed certificate now so there is no gap in compliance.',
      cta: 'Upload renewed cert',
    },
  }[variant];

  const toneCls =
    config.tone === 'red'
      ? 'bg-red-50 border-red-200'
      : 'bg-amber-50 border-amber-200';
  const iconCls =
    config.tone === 'red'
      ? 'bg-red-100 text-red-700'
      : 'bg-amber-100 text-amber-700';
  const titleCls =
    config.tone === 'red' ? 'text-red-900' : 'text-amber-900';
  const bodyCls =
    config.tone === 'red' ? 'text-red-700' : 'text-amber-700';

  const handleClick = () => {
    // Pre-fill the upload form for an insurance certificate.
    // The upload page reads `discipline` from the query string; we also
    // pass `type` and `certificateSubtype` which the upload page can
    // honour in a follow-up (for now the user just picks Category = Documents
    // and Type = Certificate manually — the discipline prefill is the
    // most useful bit).
    const qs = new URLSearchParams();
    const profession =
      (user.role?.name || user.profile?.professional_body) ?? '';
    if (profession) qs.set('discipline', profession);
    navigate(`/documents/upload?${qs.toString()}`);
  };

  return (
    <div
      className={`p-4 rounded-2xl border ${toneCls} flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300`}
    >
      <div
        className={`w-10 h-10 rounded-xl ${iconCls} flex items-center justify-center shrink-0`}
      >
        <Shield className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-normal ${titleCls} leading-tight`}>
          {config.title}
        </p>
        <p className={`text-xs ${bodyCls} mt-1 leading-relaxed`}>
          {config.body}
        </p>
      </div>
      <Button
        onClick={handleClick}
        className="bg-foreground text-white hover:bg-foreground/90 h-8 px-4 text-[11px] rounded-lg font-normal flex items-center gap-2 shrink-0"
      >
        {config.cta}
        <ArrowRight className="w-3 h-3" />
      </Button>
    </div>
  );
};

export default InsuranceBanner;
