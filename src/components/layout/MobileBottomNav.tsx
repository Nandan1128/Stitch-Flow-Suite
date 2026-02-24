import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
    LayoutDashboard,
    Users,
    Scissors,
    BarChart2,
    Calendar,
    DollarSign,
    FileText,
    Layers,
    UserCog,
} from 'lucide-react';

interface NavItem {
    to: string;
    icon: React.ReactNode;
    label: string;
    adminOnly?: boolean;
}

const allNavItems: NavItem[] = [
    { to: '/dashboard', icon: <LayoutDashboard size={22} />, label: 'Dashboard' },
    { to: '/dashboard/employees', icon: <Users size={22} />, label: 'Employees', adminOnly: true },
    { to: '/dashboard/workers', icon: <UserCog size={22} />, label: 'Workers' },
    { to: '/dashboard/products', icon: <Scissors size={22} />, label: 'Products' },
    { to: '/dashboard/production', icon: <Layers size={22} />, label: 'Production' },
    { to: '/dashboard/salary', icon: <DollarSign size={22} />, label: 'Salary' },
    { to: '/dashboard/operation-report', icon: <FileText size={22} />, label: 'Ops Rpt' },
];

const MobileBottomNav: React.FC = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const visibleItems = allNavItems.filter(item => !item.adminOnly || isAdmin);

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.08)] sm:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
            <div
                className="flex items-stretch overflow-x-auto scrollbar-none"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {visibleItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/dashboard'}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[56px] flex-1 transition-all duration-200 select-none
              ${isActive
                                ? 'text-primary bg-primary/5'
                                : 'text-gray-500 hover:text-primary hover:bg-primary/5'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <span
                                    className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}
                                >
                                    {item.icon}
                                </span>
                                <span className={`text-[10px] font-medium leading-none mt-0.5 ${isActive ? 'text-primary' : ''}`}>
                                    {item.label}
                                </span>
                                {isActive && (
                                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary" />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default MobileBottomNav;
