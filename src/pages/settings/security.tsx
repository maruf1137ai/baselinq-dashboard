import React from 'react';
import { Shield, Smartphone, Globe, Monitor, Laptop } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import EnableTwoFactorModal from './components/EnableTwoFactorModal';

const Security = () => {
  const [isTwoFactorModalOpen, setIsTwoFactorModalOpen] = React.useState(false);

  return (
    <div className="p-6 space-y-6 ">
      <div>
        <h2 className="text-[23px] font-medium text-[#1A1A1A] mb-2">Security</h2>
        <p className="text-[#6B7280] text-base">Manage account security, sessions, and authentication settings.</p>
      </div>

      {/* Top Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-[10px] bg-white ">
          <CardContent className="p-[25px]">
            <div className="w-12 h-12 rounded-[10px] bg-[#F7F7F7] flex items-center justify-center mb-3  ">
              <Shield className="w-6 h-6 text-gray-900" />
            </div>
            <h3 className="text-base  text-[#1A1A1A] mb-1">Password</h3>
            <p className="text-sm text-[#6B7280]">Last updated 45 days ago</p>
          </CardContent>
        </Card>

        <Card className="rounded-[10px] bg-white ">
          <CardContent className="p-[25px]">
            <div className="w-12 h-12 rounded-[10px] bg-[#F7F7F7] flex items-center justify-center mb-3  ">
              <Smartphone className="w-6 h-6 text-gray-900" />
            </div>
            <h3 className="text-base  text-[#1A1A1A] mb-1">2FA Status</h3>
            <p className="text-sm text-[#6B7280]">Not enabled</p>
          </CardContent>
        </Card>

        <Card className="rounded-[10px] bg-white ">
          <CardContent className="p-[25px]">
            <div className="w-12 h-12 rounded-[10px] bg-[#F7F7F7] flex items-center justify-center mb-3  ">
              <Globe className="w-6 h-6 text-gray-900" />
            </div>
            <h3 className="text-base  text-[#1A1A1A] mb-1">Active Sessions</h3>
            <p className="text-sm text-[#6B7280]">3 sessions</p>
          </CardContent>
        </Card>
      </div>

      {/* Two-Factor Authentication */}
      <Card className="rounded-[10px] bg-white ">
        <CardContent className="p-[25px] flex items-center justify-between">
          <div>
            <h3 className="text-lg  text-[#1A1A1A] mb-2">Two-Factor Authentication</h3>
            <p className="text-base text-[#6B7280]">Add an extra layer of security to your account</p>
          </div>
          <Button onClick={() => setIsTwoFactorModalOpen(true)}>Enable 2FA</Button>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card className="rounded-[10px] bg-white ">
        <CardContent className="p-[25px]">
          <div className="space-y-4">
            <h3 className="text-base  text-[#1A1A1A]">Active Sessions</h3>
            <Card className="bg-[#FAFAFA] border-[#E5E7EB]">
              <CardContent className="px-4 py-[21px]  flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-[#E5E7EB]">
                    <Monitor className="w-5 h-5 text-[#6B7280]" />
                  </div>
                  <div>
                    <div className="flex mb-1 items-center gap-2">
                      <span className="text-base text-[#1A1A1A]">Chrome on MacBook Pro</span>
                      <Badge
                        variant="secondary"
                        className="bg-[#E9F7EC6B] text-[#00C97A] hover:bg-green-50 font-normal text-xs border-[#16A34A57]"
                      >
                        Current
                      </Badge>
                    </div>
                    <p className="text-sm text-[#6B7280] mt-0.5">102.165.23.14 • Active now</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#FAFAFA] border-[#E5E7EB]">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-[#E5E7EB]">
                    <Smartphone className="w-5 h-5 text-[#6B7280]" />
                  </div>
                  <div>
                    <span className="text-base text-[#1A1A1A] block">Safari on iPhone</span>
                    <p className="text-sm text-[#6B7280] mt-0.5">102.165.23.15 • 2 hours ago</p>
                  </div>
                </div>
                <button className="text-sm text-[#F06161] hover:text-red-600 font-medium">Terminate</button>
              </CardContent>
            </Card>

            <Card className="bg-[#FAFAFA] border-[#E5E7EB]">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-[#E5E7EB]">
                    <Monitor className="w-5 h-5 text-[#6B7280]" />
                  </div>
                  <div>
                    <span className="text-base text-[#1A1A1A] block">Firefox on Windows</span>
                    <p className="text-sm text-[#6B7280] mt-0.5">41.76.34.128 • Yesterday</p>
                  </div>
                </div>
                <button className="text-sm text-[#F06161] hover:text-red-600 font-medium">Terminate</button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <EnableTwoFactorModal open={isTwoFactorModalOpen} onOpenChange={setIsTwoFactorModalOpen} />
    </div>
  );
};

export default Security;
