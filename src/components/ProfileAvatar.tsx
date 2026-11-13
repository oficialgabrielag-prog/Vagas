import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../lib/types';

interface ProfileAvatarProps {
  user?: UserProfile | null;
  userId?: string;
  avatarUrl?: string;
  name?: string;
  role?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
  onClick?: () => void;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  user,
  userId,
  avatarUrl: initialAvatarUrl,
  name: initialName,
  role: initialRole,
  size = 'md',
  className = '',
  onClick
}) => {
  const [avatar, setAvatar] = useState<string>(
    initialAvatarUrl || user?.avatar_url || user?.company?.logo_url || ''
  );
  const [name, setName] = useState<string>(
    initialName || user?.full_name || user?.company?.name || user?.company_name || 'Utilizador'
  );
  const [role, setRole] = useState<string>(
    initialRole || user?.role || 'candidate'
  );

  useEffect(() => {
    let isMounted = true;

    // If direct props are provided and valid, update state
    if (initialAvatarUrl) setAvatar(initialAvatarUrl);
    if (initialName) setName(initialName);
    if (initialRole) setRole(initialRole);

    const targetId = userId || user?.id;
    if (!targetId && user) {
      if (user.avatar_url) setAvatar(user.avatar_url);
      if (user.company?.logo_url) setAvatar(user.company.logo_url);
      if (user.full_name) setName(user.full_name);
    }

    // Dynamically fetch latest from database if targetId is available
    if (targetId) {
      const fetchLatestProfile = async () => {
        try {
          if (role === 'employer' || role === 'empresa') {
            const { data: comp } = await supabase
              .from('companies')
              .select('logo_url, nome, descricao, setor')
              .eq('id', targetId)
              .single();
            if (comp && isMounted) {
              if (comp.logo_url) setAvatar(comp.logo_url);
              if (comp.nome) setName(comp.nome);
            }
          }

          const { data: prof } = await supabase
            .from('profiles')
            .select('avatar_url, full_name, role')
            .eq('id', targetId)
            .single();

          if (prof && isMounted) {
            if (prof.avatar_url) setAvatar(prof.avatar_url);
            if (prof.full_name) setName(prof.full_name);
            if (prof.role) setRole(prof.role);
          }
        } catch {
          // Fallback to existing user object if network/query fails
          if (user && isMounted) {
            if (user.avatar_url) setAvatar(user.avatar_url);
            if (user.company?.logo_url) setAvatar(user.company.logo_url);
          }
        }
      };

      void fetchLatestProfile();
    }

    return () => {
      isMounted = false;
    };
  }, [userId, user, initialAvatarUrl, initialName, initialRole]);

  // Determine size classes or inline style
  const sizeMap = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  const sizeClass = typeof size === 'string' && sizeMap[size] ? sizeMap[size] : 'w-10 h-10 text-sm';
  const customStyle = typeof size === 'number' ? { width: size, height: size, fontSize: size * 0.4 } : {};

  const initials = name ? name.trim().charAt(0).toUpperCase() : 'U';
  const isEmployer = role === 'employer' || role === 'empresa';

  return (
    <div
      onClick={onClick}
      style={customStyle}
      className={`relative rounded-full overflow-hidden bg-[#16140F] border ${
        isEmployer ? 'border-[#D4AF37]/60' : 'border-[#D4AF37]/30'
      } text-[#F5D77A] font-bold flex items-center justify-center shrink-0 select-none transition-all ${
        onClick ? 'cursor-pointer hover:scale-105 hover:border-[#D4AF37]' : ''
      } ${sizeClass} ${className}`}
      title={name}
    >
      {avatar && avatar.startsWith('http') ? (
        <img
          src={avatar}
          alt={name}
          loading="lazy"
          className="w-full h-full object-cover"
          onError={(e) => {
            // Hide broken image and fallback to initials
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />
      ) : (
        <span className="font-extrabold">{initials}</span>
      )}
    </div>
  );
};
