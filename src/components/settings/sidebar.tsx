import { useState } from "react";
import {
  TrendingUp,
  Wand2,
  MessageSquare,
  CheckSquare,
  DollarSign,
  Shield,
  Calendar,
  Folder,
  FileText,
  Settings,
  HelpCircle,
  ChevronDown,
  Users,
  MapPin,
  CreditCard,
  Link2,
  Bell,
  Database,
  CircleCheckBig,
} from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";

const navItems = [
  {
    title: "Project",
    items: [
      {
        id: 1,
        title: "Team Management",
        url: "/settings",
        icon: <Users className="h-4 w-4 text-current" />,
      },
      {
        id: 2,
        title: "Project Details",
        url: "/settings/project-details",
        icon: <Settings className="h-4 w-4 text-current" />,
      },
      {
        id: 3,
        title: "Site Settings",
        url: "/settings/site",
        icon: <MapPin className="h-4 w-4 text-current" />,
      },
    ],
  },
  {
    title: "Configuration",
    items: [
      {
        id: 4,
        title: "Billing",
        url: "/settings/billing",
        icon: <CreditCard className="h-4 w-4 text-current" />,
      },
      {
        id: 5,
        title: "Integrations",
        url: "/settings/integrations",
        icon: <Link2 className="h-4 w-4 text-current" />,
      },
      {
        id: 6,
        title: "Security",
        url: "/settings/security",
        icon: <Shield className="h-4 w-4 text-current" />,
      },
      {
        id: 7,
        title: "Notifications",
        url: "/settings/notifications",
        icon: <Bell className="h-4 w-4 text-current" />,
      },
    ],
  },
  {
    title: "Compliance",
    items: [
      {
        id: 8,
        title: "Data Management",
        url: "/settings/data-management",
        icon: <Database className="h-4 w-4 text-current" />,
      },
      {
        id: 9,
        title: "Audit & Compliance",
        url: "/settings/audit",
        icon: <CircleCheckBig className="h-4 w-4 text-current" />,
      },
    ],
  },
];

interface SidebarProps {
  onNewChat: () => void;
}

export function Sidebar() {
  const location = useLocation();

  // All expanded initially
  const [openSections, setOpenSections] = useState(() =>
    navItems.reduce((acc, _, index) => {
      acc[index] = true;
      return acc;
    }, {})
  );

  const [open, setOpen] = useState(true);

  const toggleSection = (index) => {
    setOpenSections((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <div
      className={`border-r h-full flex flex-col border-[#DEDEDE] bg-white transition-all justify-between ${
        open ? "w-64" : "w-16"
      }`}>
      <div className="header p-6 border-b border-border_color text-xl text-[#1A1A1A]">
        Project Settings
      </div>

      <div className="flex-1 overflow-auto">
        <div className="menu p-3">
          {navItems?.map((item, index) => {
            const isOpen = openSections[index];
            const { title, items } = item;

            return (
              <div className="item flex flex-col" key={index}>
                <button
                  onClick={() => toggleSection(index)}
                  className="flex items-center justify-between text-sm text-[#6B7280] py-2 px-3 w-full hover:text-[#1A1A1A]">
                  <span>{title}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-[#6B7280] transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    isOpen ? "max-h-96" : "max-h-0"
                  }`}>
                  <div className="list flex flex-col gap-1 mt-1">
                    {items?.map(({ id, title, icon, url }) => {
                      const isActive = location.pathname === url;

                      return (
                        <Link
                          to={url}
                          key={id}
                          className={`flex items-center gap-3 text-sm py-2 px-3 rounded-[10px] transition-all
                            ${
                              isActive
                                ? "bg-[#F3F4F6] text-[#1A1A1A]"
                                : "text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F3F4F6]"
                            }
                          `}>
                          {icon}
                          {title}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
