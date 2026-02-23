import { ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ProjectStatusCardProps {
  title: string;
  value: string;
  subtitle?: string;
  badgeText: string;
  badgeVariant: 'default' | 'destructive' | 'success' | 'warning';
  actionText: string;
  actionHref?: string;
  icon: React.ReactNode;
  link?: boolean;
  trendArrow?: 'up' | 'down' | 'flat';
}

export function ProjectStatusCard({
  icon,
  title,
  value,
  subtitle,
  badgeText,
  badgeVariant,
  actionText,
  actionHref = '#',
  link = false,
  trendArrow,
}: ProjectStatusCardProps) {
  const badgeClasses = {
    default: 'bg-muted text-foreground',
    destructive: 'bg-[#FEF2F2] text-[#EF4444] border-[#FECACA]',
    success: 'bg-[#F0FDF4] text-[#10B981] border-[#BBF7D0]',
    warning: 'bg-orange-50 text-orange-700 border-orange-200',
  };

  const cardBg = {
    default: 'bg-[#F3F2F0]',
    destructive: 'bg-red-50/80 border border-red-200/50',
    success: 'bg-emerald-50/60 border border-emerald-200/40',
    warning: 'bg-orange-50/60 border border-orange-200/40',
  };

  const valueColor = {
    default: 'text-[#0F172A]',
    destructive: 'text-red-600',
    success: 'text-emerald-600',
    warning: 'text-orange-600',
  };

  const trendIcon = trendArrow === 'up' ? '↑' : trendArrow === 'down' ? '↓' : trendArrow === 'flat' ? '→' : null;
  const trendColor = trendArrow === 'up' ? 'text-emerald-500' : trendArrow === 'down' ? 'text-red-500' : 'text-gray-400';

  return (
    <Card className={`${cardBg[badgeVariant]} !border-0 rounded-[13px] shadow-none`}>
      <CardContent className="p-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            {icon}
            <p className="text-sm text-gray2 mb-1">{title}</p>
          </div>
          {badgeText && (
            <Badge variant="outline" className={`${badgeClasses[badgeVariant]} text-xs font-medium`}>
              {badgeText}
            </Badge>
          )}
        </div>

        <div className="bg-white p-[14px] rounded-[6px]">
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <div className="flex items-baseline gap-2">
              <h3 className={`text-[32px] mt-5 ${valueColor[badgeVariant]}`}>{value}</h3>
              {trendIcon && <span className={`text-lg font-medium ${trendColor}`}>{trendIcon}</span>}
            </div>
            {subtitle && <p className="text-xs text-gray2 bg-[#F3F2F0] py-1.5 px-5 rounded-[4px]">{subtitle}</p>}
          </div>

          {/* Progress arc for visual weight */}
          {(badgeVariant === 'destructive' || badgeVariant === 'success') && (
            <div className="mt-3">
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${badgeVariant === 'destructive' ? 'bg-red-400' : 'bg-emerald-400'}`}
                  style={{ width: `${Math.min(parseInt(value) || 50, 100)}%` }}
                />
              </div>
            </div>
          )}

          {link && (
            <div className="flex justify-end mt-6">
              <a
                href={actionHref}
                className="inline-flex items-center text-xs text-black underline hover:text-primary transition-colors group"
              >
                {actionText}
                <ArrowRight className="ml-1 h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
