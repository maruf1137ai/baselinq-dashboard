import RiskOverview from '@/components/Compliance/RiskOverView';
import GenerateNoticeModal from '@/components/Compliance/GenerateNoticeModal';
import AddEvidenceModal from '@/components/Compliance/AddEvidenceModal';
import { DashboardLayout } from '@/components/DashboardLayout';
import Asterisk from '@/components/icons/Asterisk';
import CashIcon from '@/components/icons/CashIcon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, ChevronDown, Filter, Link2, Plus, Scan, ScanLine } from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Compliance = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerateNoticeModalOpen, setIsGenerateNoticeModalOpen] = useState(false);
  const [isAddEvidenceModalOpen, setIsAddEvidenceModalOpen] = useState(false);

  return (
    <DashboardLayout padding="p-0">
      <div className="min-h-screen">
        <div className="grid grid-cols-3 ">
          <div className="col-span-2 px-8 py-[17px]">
            <div>
              <p className="text-base text-gray3 mb-1">Dashboard</p>
              <h1 className="text-3xl  tracking-tight text-foreground">Compliance</h1>
            </div>
            {/* Stats card */}
            <div className="grid gap-2.5 mt-[27px] md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-[#F3F2F0] !border-0 rounded-[13px] shadow-none">
                <CardContent className="p-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <CashIcon />
                      <p className="text-sm text-gray2 mb-1">Compliance Score</p>
                    </div>
                  </div>
                  <div className="bg-white py-[6px] px-[14px] rounded-[6px]">
                    <div className="">
                      <h3 className="text-2xl text-[#0F172A]">25%</h3>
                      <Progress value={25} className="h-[8px]  my-2.5" />
                      <p className="text-xs text-[#717784] ">Below target threshold</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#F3F2F0] !border-0 flex flex-col rounded-[13px] shadow-none">
                <CardContent className="p-2.5  flex-1 flex flex-col ">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <CashIcon />
                      <p className="text-sm text-gray2 mb-1">Compliance Score</p>
                    </div>
                  </div>
                  <div className="bg-white flex flex-col justify-between flex-1 py-[10px] px-[14px] rounded-[6px]">
                    <h3 className="text-2xl text-[#0F172A]">3</h3>
                    <p className="text-xs text-[#717784] ">
                      <span className="text-[#DC2626]">3 overdue</span> / 0 due soon
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#F3F2F0] !border-0 flex flex-col rounded-[13px] shadow-none">
                <CardContent className="p-2.5  flex-1 flex flex-col ">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <CashIcon />
                      <p className="text-sm text-gray2 mb-1">Risks Detected</p>
                    </div>
                  </div>
                  <div className="bg-white flex flex-col justify-between flex-1 py-[10px] px-[14px] rounded-[6px]">
                    <h3 className="text-2xl text-black">
                      1 / 2 <span className="text-[#717784]">/ 1</span>
                    </h3>
                    <p className="text-xs text-[#717784] ">High / Medium / Low</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#F3F2F0] !border-0 flex flex-col rounded-[13px] shadow-none">
                <CardContent className="p-2.5  flex-1 flex flex-col ">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <Asterisk />
                      <p className="text-sm text-gray2 mb-1">Evidence Missing</p>
                    </div>
                  </div>
                  <div className="bg-white flex flex-col justify-between flex-1 py-[10px] px-[14px] rounded-[6px]">
                    <h3 className="text-2xl text-black">3</h3>
                    <p className="text-xs text-[#717784] ">3 items need documentation</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-3 mt-6 mb-[28px] ">
              <Input
                type="text"
                placeholder="Search compliance items..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="flex-1 bg-white py-1"
              />

              {/* Filters menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-white h-full text-[15px] py-[9px]">
                    <Filter className="mr-2" />
                    Filters
                    <ChevronDown className="ml-2 w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="w-52 p-2">
                  <DropdownMenuItem>Risk Level</DropdownMenuItem>
                  <DropdownMenuItem>Clause Type</DropdownMenuItem>
                  <DropdownMenuItem>Owner</DropdownMenuItem>
                  <DropdownMenuItem>Due Date</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Add menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className=" text-[15px] py-[9px]">
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                    <ChevronDown className="ml-2 w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="w-56 p-2">
                  <DropdownMenuItem>New compliance item</DropdownMenuItem>
                  <DropdownMenuItem>New evidence</DropdownMenuItem>
                  <DropdownMenuItem>Import CSV</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="outline" className="bg-white text-[15px] py-[9px]">
                <Scan className="w-4 h-4 mr-2" /> Scan Docs
              </Button>
            </div>

            {/* Client Approval for VO-001 */}

            <Card className="border-none shadow-none p-[7px] bg-[#F3F2F0]">
              <CardContent className="p-0">
                <div className="flex justify-between px-4 items-start mb-[7px]">
                  <h3 className="text-sm font-normal text-[#6B6B6B]">Client Approval for VO-001</h3>
                  <div className="flex items-center gap-2 ">
                    <span className="text-sm text-[#00000091]">Due 8 Jan</span>
                    <Badge variant="destructive" className="bg-red-50 text-red-600 hover:bg-red-50 border border-red-200">
                      Overdue
                    </Badge>
                  </div>
                </div>

                <div className="bg-white py-4 px-6 rounded-[6px]">
                  <div className="flex items-center gap-3  ">
                    <span className="text-sm text-[#717784]">Contract: JBCC 13.3</span>
                    <Badge variant="destructive" className="bg-red-50 text-red-600 hover:bg-red-50 border border-red-200">
                      High Risk
                    </Badge>
                  </div>

                  <Badge variant="secondary" className="bg-[#FFF7ED] text-[#FF8C00] border border-[#FED7AA] mt-4 mb-[14px]">
                    Blocks payment
                  </Badge>

                  <div className="bg-red-50 border border-[#DC262630] rounded-[49px] p-[14px] mb-4">
                    <div className="flex items-center gap-2 text-[#DC2626]">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">2 days until penalty clause applies</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-[#717784]">Evidence 0/3</span>
                    <span className="text-xs text-[#DC2626] ">0%</span>
                  </div>

                  <Progress value={0} className="h-[8px] mb-6" />

                  <div className="flex items-center gap-3">
                    <Button variant="link" className="text-[#8081F6] p-0 h-auto">
                      <Link2 className="w-4 h-4 mr-1" />
                      Links (3)
                    </Button>
                    <Badge variant="secondary" className="bg-[#E8EDFF] rounded-[4px] text-[#8081F6] border-none py-1 text-xs">
                      task-vo
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Environmental Permit */}
            <Card className="border-none mt-[27px] shadow-none p-[7px] bg-[#F3F2F0]">
              <CardContent className="p-0">
                <div className="flex justify-between px-4 items-start mb-[7px]">
                  <h3 className="text-sm font-normal text-[#6B6B6B]">Environmental Permit</h3>
                  <div className="flex items-center gap-2 ">
                    <span className="text-sm text-[#00000091]">Due 8 Jan</span>
                  </div>
                </div>

                <div className="bg-white py-4 px-6 rounded-[6px]">
                  <div className="flex items-center gap-3  ">
                    <span className="text-sm text-[#717784]">Contract: National Environmental Management Act 107.2</span>
                    <Badge variant="destructive" className="bg-[#FFF7ED] text-[#FF8C00] hover:bg-red-50 border border-[#FED7AA]">
                      Medium Risk
                    </Badge>
                  </div>

                  <div className="mt-4 mb-[33px]">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm text-[#717784]">Evidence 0/3</span>
                      <span className="text-xs text-[#DC2626] ">0%</span>
                    </div>

                    <Progress value={0} className="h-[8px] mb-6" />

                    <div className="flex items-center gap-3">
                      <Button variant="link" className="text-[#8081F6] p-0 h-auto">
                        <Link2 className="w-4 h-4 mr-1" />
                        Links (3)
                      </Button>
                    </div>
                  </div>

                  <div className="text-sm space-y-4 text-[#1A1A1A]">
                    <div className="space-y-2">
                      <p className="text-[#717784]">Notes</p>
                      <p>Environmental permit renewal in progress. Site inspection scheduled for next week.</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[#717784]">Last Update</p>
                      <p>1 day ago by Michael Lee</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <Button variant="default" className="" onClick={() => setIsGenerateNoticeModalOpen(true)}>
                        Generate Notice
                      </Button>
                      <Button variant="outline" className="" onClick={() => setIsAddEvidenceModalOpen(true)}>
                        Add Evidence
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6 px-[25px] py-[45px] border-l">
            <RiskOverview />
          </div>
        </div>
      </div>
      <GenerateNoticeModal isOpen={isGenerateNoticeModalOpen} onClose={() => setIsGenerateNoticeModalOpen(false)} />
      <AddEvidenceModal isOpen={isAddEvidenceModalOpen} onClose={() => setIsAddEvidenceModalOpen(false)} />
    </DashboardLayout>
  );
};

export default Compliance;
