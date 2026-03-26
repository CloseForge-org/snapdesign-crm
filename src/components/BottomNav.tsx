'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  {
    href: '/',
    label: '首頁',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? '#e8734a' : 'none'} stroke={active ? '#e8734a' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: '/pipeline',
    label: '流程',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#e8734a' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="5" height="18" rx="1" fill={active ? '#e8734a' : 'none'} />
        <rect x="10" y="3" width="5" height="12" rx="1" fill={active ? '#e8734a' : 'none'} />
        <rect x="17" y="3" width="5" height="7" rx="1" fill={active ? '#e8734a' : 'none'} />
      </svg>
    ),
  },
  {
    href: '/customers',
    label: '客戶',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#e8734a' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-lg">
      <div className="max-w-2xl mx-auto flex items-center justify-around pb-safe-bottom">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`bottom-nav-item flex-1 py-2 ${active ? 'text-[#e8734a]' : 'text-gray-400'}`}
            >
              {item.icon(active)}
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </Link>
          )
        })}

        {/* Add New Customer FAB */}
        <Link
          href="/customers/new"
          className="flex-1 flex flex-col items-center py-2"
        >
          <div className="w-11 h-11 bg-[#e8734a] rounded-full flex items-center justify-center shadow-md active:opacity-80 transition-opacity -mt-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span className="text-[10px] text-[#e8734a] font-medium mt-0.5">新增</span>
        </Link>
      </div>
    </nav>
  )
}
