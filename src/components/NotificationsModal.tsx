import React from 'react';
import { Bell, X, CheckCircle2, ShieldCheck, ExternalLink } from 'lucide-react';
import { NotificationItem, UserProfile } from '../lib/types';
import { StoreService } from '../lib/store';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  notifications: NotificationItem[];
  onNotificationUpdate: () => void;
  setCurrentTab: (tab: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  notifications,
  onNotificationUpdate,
  setCurrentTab
}) => {
  if (!isOpen || !currentUser) return null;

  const handleMarkAsRead = (id: string) => {
    StoreService.markNotificationAsRead(currentUser.id, id);
    onNotificationUpdate();
  };

  const handleMarkAllAsRead = () => {
    notifications.forEach(n => {
      if (!n.read) {
        StoreService.markNotificationAsRead(currentUser.id, n.id);
      }
    });
    onNotificationUpdate();
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Agora mesmo';
      if (mins < 60) return `Há ${mins} min`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `Há ${hours}h`;
      const days = Math.floor(hours / 24);
      return `Há ${days}d`;
    } catch {
      return 'Recentemente';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-hidden">
      <div className="w-full h-full flex flex-col">
        {/* Header */}
        <div className="bg-[#0F4C9C] p-5 sm:p-6 text-white relative flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-[#FFC20E]">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest font-bold text-[#FFC20E]">
                Central de Alertas
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold">Notificações</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl transition"
              >
                Marcar lidas
              </button>
            )}
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Notifications list */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1 divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">Sem notificações no momento.</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Os avisos do sistema, interações e atualizações provinciais aparecerão aqui.
              </p>
            </div>
          ) : (
            notifications.map(notif => {
              const isSys = notif.is_system || notif.sender_name === 'Notificação do Sistema';
              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (!notif.read) handleMarkAsRead(notif.id);
                    if (notif.link) {
                      // Se for um link direto para dashboard
                      if (notif.link.includes('dashboard') || notif.link === 'followers' || notif.link === 'notifications') {
                        setCurrentTab(notif.link);
                      } else {
                        // Se for um link para um item específico, despacha um evento global
                        window.dispatchEvent(new CustomEvent('navigate-to-item', { 
                          detail: { link: notif.link } 
                        }));
                      }
                      onClose();
                    }
                  }}
                  className={`pt-3 first:pt-0 transition p-3 rounded-2xl cursor-pointer ${
                    notif.read ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/60 hover:bg-blue-50 border border-blue-100/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isSys ? 'bg-amber-100 text-amber-800' : 'bg-[#0F4C9C]/10 text-[#0F4C9C]'
                      }`}>
                        {isSys ? <ShieldCheck className="w-5 h-5 text-amber-600" /> : <Bell className="w-5 h-5" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isSys && (
                            <span className="text-[10px] font-black bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Notificação do Sistema
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-slate-400">{formatTimeAgo(notif.created_at)}</span>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-[#0F4C9C]" title="Não lida" />
                          )}
                        </div>
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">{notif.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                      </div>
                    </div>

                    {!notif.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notif.id);
                        }}
                        className="text-[10px] font-bold text-[#0F4C9C] hover:underline shrink-0"
                      >
                        Marcar lida
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500">
            CuneneVagas • Plataforma Oficial de Empregos, Negócios e Desenvolvimento Local.
          </p>
        </div>
      </div>
    </div>
  );
};
