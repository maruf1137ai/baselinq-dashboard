import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const activities = [
  {
    id: 1,
    user: "Sarah Johnson",
    action: "Created new report",
    time: "2 minutes ago",
    status: "success",
  },
  {
    id: 2,
    user: "Mike Chen",
    action: "Updated user profile",
    time: "15 minutes ago",
    status: "info",
  },
  {
    id: 3,
    user: "Emily Rodriguez",
    action: "Deleted old data",
    time: "1 hour ago",
    status: "warning",
  },
  {
    id: 4,
    user: "James Wilson",
    action: "Exported analytics",
    time: "3 hours ago",
    status: "success",
  },
];

const statusColors = {
  success: "bg-green-500/10 text-green-700 hover:bg-green-500/20",
  info: "bg-blue-500/10 text-blue-700 hover:bg-blue-500/20",
  warning: "bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20",
};

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start justify-between py-3 border-b last:border-0">
              <div className="flex-1">
                <p className="font-medium text-foreground">{activity.user}</p>
                <p className="text-sm text-muted-foreground">{activity.action}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{activity.time}</span>
                <Badge variant="outline" className={statusColors[activity.status as keyof typeof statusColors]}>
                  {activity.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
