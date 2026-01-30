import { LucideIcon, ArrowRight } from 'lucide-react';
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
}: ProjectStatusCardProps) {
  const badgeClasses = {
    default: 'bg-muted text-foreground',
    destructive: 'bg-[#FEF2F2] text-[#EF4444] border-[#FECACA]',
    success: 'bg-[#F0FDF4] text-[#10B981] border-[#BBF7D0]',
    warning: 'bg-orange-50 text-orange-700 border-orange-200',
  };

  return (
    <Card className="bg-[#F3F2F0] !border-0 rounded-[13px] shadow-none">
      <CardContent className="p-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          {/* <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          </div> */}
          <div className="flex items-center gap-2.5">
            {/* <Icon className="h-4 w-4 text-gray2" /> */}
            {icon}
            {/* <img src={icon} alt="" className="h-4 w-4 text-gray2" /> */}
            <p className="text-sm text-gray2 mb-1">{title}</p>
          </div>
          {badgeText && (
            <Badge variant="outline" className={`${badgeClasses[badgeVariant]} text-xs font-medium`}>
              {badgeText}
            </Badge>
          )}
          {/* <div className="flex-1 min-w-0"></div> */}
        </div>

        <div className="bg-white p-[14px] rounded-[6px]">
          <div className="flex justify-between items-center  gap-2 flex-wrap">
            <h3 className="text-[32px] mt-5  text-[#0F172A]">{value}</h3>
            {subtitle && <p className="text-xs text-gray2  bg-[#F3F2F0] py-1.5 px-5 rounded-[4px]">{subtitle}</p>}
          </div>

          {link && (
            <div className="flex justify-end mt-6">
              <a
                href={actionHref}
                className="inline-flex items-center text-xs text-black underline hover:text-primary transition-colors group "
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
