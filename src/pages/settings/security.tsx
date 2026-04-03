// UPCOMING_FEATURE: All original code commented out — restore when backend integration is ready

// import React from 'react';
// import { Shield, Smartphone, Globe, Monitor } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import EnableTwoFactorModal from './components/EnableTwoFactorModal';

import UpcomingFeature from "@/components/settings/UpcomingFeature";

const Security = () => {
  // const [isTwoFactorModalOpen, setIsTwoFactorModalOpen] = React.useState(false);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-normal tracking-tight text-foreground">Security</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage account security, sessions, and authentication settings.</p>
      </div>
      <UpcomingFeature title="Security" />
      {/* UPCOMING_FEATURE: Original JSX commented out below — restore when backend integration is ready

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-border p-4">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center mb-3">
            <Shield className="w-4 h-4 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium text-foreground mb-1">Password</h3>
          <p className="text-xs text-muted-foreground mb-3">Last updated 45 days ago</p>
          <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg">Change Password</Button>
        </div>

        <div className="bg-white rounded-lg border border-border p-4">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center mb-3">
            <Smartphone className="w-4 h-4 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium text-foreground mb-1">2FA Status</h3>
          <p className="text-xs text-muted-foreground mb-3">Not enabled</p>
          <Button size="sm" className="h-8 text-xs rounded-lg" onClick={() => setIsTwoFactorModalOpen(true)}>Enable 2FA</Button>
        </div>

        <div className="bg-white rounded-lg border border-border p-4">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center mb-3">
            <Globe className="w-4 h-4 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium text-foreground mb-1">Active Sessions</h3>
          <p className="text-xs text-muted-foreground">3 sessions</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <span className="text-sm font-medium text-foreground">Active Sessions</span>
        </div>
        <div className="divide-y divide-border">
          {[
            { icon: Monitor, name: "Chrome on MacBook Pro", ip: "102.165.23.14", time: "Active now", current: true },
            { icon: Smartphone, name: "Safari on iPhone", ip: "102.165.23.15", time: "2 hours ago", current: false },
            { icon: Monitor, name: "Firefox on Windows", ip: "41.76.34.128", time: "Yesterday", current: false },
          ].map((session, i) => (
            <div key={i} className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <session.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground">{session.name}</span>
                    {session.current && (
                      <Badge className="bg-green-50 text-green-700 border-0 text-xs px-2 py-0.5 rounded-full font-normal">Current</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{session.ip} · {session.time}</p>
                </div>
              </div>
              {!session.current && (
                <button className="text-xs text-destructive hover:underline">Terminate</button>
              )}
            </div>
          ))}
        </div>
      </div>

      <EnableTwoFactorModal open={isTwoFactorModalOpen} onOpenChange={setIsTwoFactorModalOpen} />
      */}
    </div>
  );
};

export default Security;
