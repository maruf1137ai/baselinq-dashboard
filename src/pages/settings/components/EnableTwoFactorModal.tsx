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
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="text-sm font-medium text-foreground">Enable Two-Factor Authentication</DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="text-center space-y-6">
            <p className="text-muted-foreground text-sm text-left">Scan this QR code with your authenticator app:</p>

            <div className="flex justify-center">
              <div className="w-[200px] h-[200px] border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted">
                <div className="relative">
                  <Lock className="w-16 h-16 text-muted-foreground" strokeWidth={1.5} />
                  {/* Simulating the key overlay if needed, or just keeping simple lock for now as per plan */}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm text-foreground">Enter 6-digit code</label>
            <Input
              placeholder="123456"
              className="text-center placeholder:text-muted-foreground placeholder:text-2xl !text-2xl bg-muted border-border tracking-widest h-12"
              maxLength={6}
            />
          </div>

          <div className="bg-sidebar rounded-lg p-4 flex gap-3">
            <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              Keep your backup codes in a safe place. You'll need them if you lose access to your authenticator app.
            </p>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border sm:justify-between gap-3">
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
