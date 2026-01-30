import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Send } from 'lucide-react';

interface AskRegulationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AskRegulationsModal: React.FC<AskRegulationsModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');

  const suggestedQuestions = [
    "What is Clause 13.3 about?",
    "Explain notice period requirements",
    "Budget threshold rules?"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] bg-white p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b flex flex-row items-center gap-2 space-y-0">
          <Sparkles className="w-5 h-5 text-[#1A1A1A]" />
          <DialogTitle className="text-[16px] text-[#1A1F36] font-normal">Ask Baselinq AI About Regulations</DialogTitle>
        </DialogHeader>
        
        <div className="p-6 min-h-[400px] flex flex-col bg-[#F9FAFB]">
          {/* Bot Message */}
          <div className="bg-white border border-[#E6E8EB] rounded-xl px-[17px] py-[20px] mb-auto max-w-[85%]">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#1A1A1A]" />
              <span className="text-sm  text-[#6B7280]">Baselinq AI</span>
            </div>
            <p className="text-[#1A1F36] text-sm leading-relaxed">
              Hello! I'm Baselinq AI. I can help you understand contract clauses, regulations, and compliance requirements. What would you like to know?
            </p>
          </div>
        </div>

        <div className="p-6 border-t bg-white">
          <div className="flex gap-3 mb-4">
            <Input 
              placeholder="Ask about contract clauses, regulations, or compliance..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 h-12 text-base"
            />
            <Button className="h-12 px-6 bg-[#8081F6] hover:bg-[#6b6ce0] text-white gap-2">
              <Send className="w-4 h-4" />
              Send
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, index) => (
              <button 
                key={index}
                className="px-4 py-2 bg-[#F9FAFB] hover:bg-[#E5E7EB] rounded-[10px] text-sm text-[#6B7280] transition-colors"
                onClick={() => setQuery(question)}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AskRegulationsModal;
