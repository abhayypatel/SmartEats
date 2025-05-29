import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  HomeIcon,
  CameraIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeIconSolid,
  CameraIcon as CameraIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  ClipboardDocumentListIcon as ClipboardDocumentListIconSolid,
  UserIcon as UserIconSolid,
} from "@heroicons/react/24/solid";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const navItems = [
    {
      name: "Home",
      path: "/",
      icon: HomeIcon,
      activeIcon: HomeIconSolid,
    },
    {
      name: "Camera",
      path: "/camera",
      icon: CameraIcon,
      activeIcon: CameraIconSolid,
    },
    {
      name: "Progress",
      path: "/progress",
      icon: ChartBarIcon,
      activeIcon: ChartBarIconSolid,
    },
    {
      name: "Meals",
      path: "/meals",
      icon: ClipboardDocumentListIcon,
      activeIcon: ClipboardDocumentListIconSolid,
    },
    {
      name: "Profile",
      path: "/profile",
      icon: UserIcon,
      activeIcon: UserIconSolid,
    },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <main className="relative">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-around py-2">
            {navItems.map((item) => {
              const active = isActive(item.path);
              const IconComponent = active ? item.activeIcon : item.icon;

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 ${
                    active
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  <IconComponent className="h-6 w-6 mb-1" />
                  <span
                    className={`text-xs font-medium ${
                      active ? "text-blue-600 dark:text-blue-400" : ""
                    }`}
                  >
                    {item.name}
                  </span>
                  {active && (
                    <div className="absolute -top-0.5 w-1 h-1 bg-blue-600 dark:bg-blue-400 rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Layout;
