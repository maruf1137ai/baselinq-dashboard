import React from 'react';
import { Lock, Lightbulb } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface EnableTwoFactorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EnableTwoFactorModal = ({ open, onOpenChange }: EnableTwoFactorModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden bg-white">
        <DialogHeader className="px-6 py-4 border-b border-[#E5E7EB]">
          <DialogTitle className="text-base font-normal text-[#1A1A1A]">Enable Two-Factor Authentication</DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="text-center space-y-6">
            <p className="text-[#6B7280] text-base text-left">Scan this QR code with your authenticator app:</p>

            <div className="flex justify-center">
              <div className="w-[200px] h-[200px] border-2 border-dashed border-[#E5E7EB] rounded-[10px] flex items-center justify-center bg-[#FAFAFA]">
                <div className="relative">
                  <Lock className="w-16 h-16 text-[#D1D5DB]" strokeWidth={1.5} />
                  {/* Simulating the key overlay if needed, or just keeping simple lock for now as per plan */}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-base text-[#1A1A1A]">Enter 6-digit code</label>
            <Input
              placeholder="123456"
              className="text-center placeholder:text-[#1A1A1A80] placeholder:text-[24px] !text-[24px] bg-[#FAFAFA] border-[#E5E7EB] tracking-widest h-12"
              maxLength={6}
            />
          </div>

          <div className="bg-[#F3F2F0] rounded-[10px] p-4 flex gap-3">
            <Lightbulb className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
            <p className="text-sm text-[#000]">
              Keep your backup codes in a safe place. You'll need them if you lose access to your authenticator app.
            </p>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-[#E5E7EB] sm:justify-between gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Cancel
          </Button>
          <Button className="w-full " onClick={() => onOpenChange(false)}>
            Enable 2FA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EnableTwoFactorModal;
