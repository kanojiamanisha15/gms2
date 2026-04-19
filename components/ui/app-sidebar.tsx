"use client";

import * as React from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Users2,
  UserCog,
  CreditCard,
  Receipt,
  Building2,
  Landmark,
} from "lucide-react";
import {
  getFirstAccessibleHref,
  userCanViewDashboard,
  userCanViewMembers,
  userCanViewGyms,
  userCanViewMembershipPlans,
  userCanViewBanks,
  userCanViewExpenses,
  userCanViewTrainers,
  userCanViewUsersPage,
} from "@/lib/route-access";

import { NavMain } from "@/components/ui/nav-main";
import { NavSecondary } from "@/components/ui/nav-secondary";
import { NavUser } from "@/components/ui/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const defaultUser = {
  name: "User",
  email: "",
  avatar: "",
};

const navSecondary: {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
}[] = [
    // {
    //   title: "Settings",
    //   url: "/settings",
    //   icon: Settings,
    // },
  ];

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user?: {
    id: number;
    name: string;
    email: string;
    role?: string;
    permissions?: string[];
    created_at?: string | Date;
  };
};

export function AppSidebar({ user: userProp, ...props }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, setOpenMobile, setOpen } = useSidebar();

  const navMain = React.useMemo(() => {
    const items: {
      title: string;
      url: string;
      icon: typeof LayoutDashboard;
    }[] = [];
    if (userCanViewDashboard(userProp)) {
      items.push({ title: "Dashboard", url: "/dashboard", icon: LayoutDashboard });
    }
    if (userCanViewUsersPage(userProp)) {
      items.push({ title: "Users", url: "/users", icon: Users2 });
    }
    if (userCanViewMembers(userProp)) {
      items.push({ title: "Members", url: "/members", icon: Users });
    }
    if (userCanViewGyms(userProp)) {
      items.push({ title: "Gyms", url: "/gyms", icon: Building2 });
    }
    if (userCanViewTrainers(userProp)) {
      items.push({ title: "Trainers/Staff", url: "/trainers-staff", icon: UserCog });
    }
    if (userCanViewMembershipPlans(userProp)) {
      items.push({ title: "Membership Plans", url: "/membership-plans", icon: CreditCard });
    }
    if (userCanViewBanks(userProp)) {
      items.push({ title: "Banks", url: "/banks", icon: Landmark });
    }
    if (userCanViewExpenses(userProp)) {
      items.push({ title: "Expenses", url: "/expenses", icon: Receipt });
    }
    return items;
  }, [userProp]);

  const primaryNavHref = userProp
    ? getFirstAccessibleHref(userProp)
    : "/dashboard";

  const user = userProp
    ? {
      name: userProp.name,
      email: userProp.email,
      avatar: "",
    }
    : defaultUser;

  const isOnPrimaryNav = pathname === primaryNavHref || pathname === "/";
  const closeSidebar = () => {
    if (isMobile) setOpenMobile(false);
    else setOpen(false);
  };
  const handleLogoClick = () => {
    if (!isOnPrimaryNav) {
      closeSidebar();
      router.push(primaryNavHref);
    }
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:!p-1.5 cursor-pointer"
              onClick={!isOnPrimaryNav ? handleLogoClick : undefined}
            >
              <Image
                src="/gymlogo.png"
                alt="GymOS logo"
                width={150}
                height={0}
                className="h-auto w-auto"
                priority
                unoptimized
                draggable={false}
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
