import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { soundEffects } from "../lib/soundEffects";

export interface NotificationRecord {
  id: string;
  user_id?: string;
  title?: string;
  titulo?: string;
  message?: string;
  mensagem?: string;
  content?: string;
  read?: boolean;
  lida?: boolean;
  created_at: string;
  link?: string;
  type?: string;
}

interface TopNotificationsProps {
  session: any;
  onNavigate?: (moduleName: string) => void;
}

export function TopNotifications({ session, onNavigate }: TopNotificationsProps) {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [latestAlert, setLatestAlert] = useState<NotificationRecord | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const alertTimeoutRef = useRef<any>(null);

  const userId = session?.user?.id;
  const isUUID = typeof userId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);

  // Carregar notificações iniciais
  async function fetchNotifications() {
    try {
      let query = supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (isUUID) {
        query = query.or(`user_id.eq.${userId},user_id.is.null`);
      }

      const { data, error } = await query;

      if (!error && data) {
        setNotifications(data);
        const unread = data.filter((n) => !n.read && !n.lida).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.warn("Erro ao buscar notificações iniciais:", err);
    }
  }

  // Escuta em tempo real da tabela 'notifications' do Supabase
  useEffect(() => {
    fetchNotifications();

    // Canal dedicado para notificações em tempo real
    const channelId = userId
      ? `realtime-user-notifications-${userId.slice(0, 8)}`
      : `realtime-public-notifications-${Math.random().toString(36).substring(2, 7)}`;

    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const newRow = payload.new as NotificationRecord;

          // Verificar se a notificação é destinada ao utilizador atual ou se é global
          if (!newRow.user_id || !userId || newRow.user_id === userId) {
            handleIncomingNotification(newRow);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const updatedRow = payload.new as NotificationRecord;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updatedRow.id ? updatedRow : n))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const oldRow = payload.old as NotificationRecord;
          setNotifications((prev) => prev.filter((n) => n.id !== oldRow.id));
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[Notificações Realtime] Subscrito com sucesso na tabela notifications");
        }
      });

    return () => {
      supabase.removeChannel(channel);
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
    };
  }, [userId]);

  // Manipular nova notificação recebida
  function handleIncomingNotification(newNotif: NotificationRecord) {
    // 1. Tocar efeito sonoro amigável
    try {
      soundEffects.playLikeSound();
    } catch {
      // ignore
    }

    // 2. Atualizar contagem e lista
    setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
    setUnreadCount((prev) => prev + 1);

    // 3. Exibir Alerta Visual no topo da aplicação
    setLatestAlert(newNotif);

    // Auto-fechar o alerta visual após 8 segundos
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
    }
    alertTimeoutRef.current = setTimeout(() => {
      setLatestAlert(null);
    }, 8000);
  }

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Marcar todas como lidas
  async function markAllAsRead() {
    if (!userId) return;

    try {
      await supabase
        .from("notifications")
        .update({ read: true, lida: true })
        .eq("user_id", userId);

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, lida: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.warn("Erro ao marcar notificações como lidas:", err);
    }
  }

  // Marcar única notificação como lida
  async function handleNotificationClick(notif: NotificationRecord) {
    if (!notif.read && !notif.lida && notif.id) {
      try {
        await supabase
          .from("notifications")
          .update({ read: true, lida: true })
          .eq("id", notif.id);

        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true, lida: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.warn("Erro ao atualizar notificação:", err);
      }
    }

    setIsDropdownOpen(false);
    setLatestAlert(null);

    // Navegar se houver link ou destino associado
    if (notif.link && onNavigate) {
      const target = notif.link.toLowerCase();
      if (target.includes("vaga") || target.includes("job")) onNavigate("Vagas");
      else if (target.includes("market") || target.includes("prod")) onNavigate("Marketplace");
      else if (target.includes("comunidade") || target.includes("post") || target.includes("feed")) onNavigate("Comunidade");
      else if (target.includes("empresa")) onNavigate("Empresas");
      else if (target.includes("candidat")) onNavigate("Candidatos");
      else onNavigate("Notificações");
    } else if (onNavigate) {
      onNavigate("Notificações");
    }
  }

  // Título e mensagem normalizados
  const getTitle = (n: NotificationRecord) => n.title || n.titulo || "Nova Notificação";
  const getMessage = (n: NotificationRecord) => n.message || n.mensagem || n.content || "Tens uma nova atualização na plataforma CuneneVagas.";

  return (
    <>
      {/* 1. Alerta Visual Flutuante no Topo da Aplicação quando um novo registo for inserido */}
      {latestAlert && (
        <div className="cv-notification-toast-wrapper" role="alert">
          <div
            className="cv-notification-toast"
            onClick={() => handleNotificationClick(latestAlert)}
          >
            <div className="cv-toast-icon-pulse">
              <span className="cv-toast-bell">🔔</span>
              <span className="cv-toast-glow"></span>
            </div>

            <div className="cv-toast-content">
              <div className="cv-toast-header">
                <strong>{getTitle(latestAlert)}</strong>
                <span className="cv-toast-time">Agora mesmo</span>
              </div>
              <p>{getMessage(latestAlert)}</p>
            </div>

            <button
              className="cv-toast-close"
              onClick={(e) => {
                e.stopPropagation();
                setLatestAlert(null);
              }}
              title="Fechar alerta"
              aria-label="Fechar alerta"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 2. Sino de Notificações com Badge e Dropdown para a Barra Superior */}
      <div className="cv-notification-bell-container" ref={dropdownRef}>
        <button
          className={`cv-notification-bell-btn ${unreadCount > 0 ? "has-unread" : ""}`}
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          title="Notificações em tempo real"
          aria-label="Notificações"
        >
          <span className="cv-bell-icon">🔔</span>
          {unreadCount > 0 && (
            <span className="cv-notification-badge">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* Menu Dropdown de Notificações */}
        {isDropdownOpen && (
          <div className="cv-notification-dropdown">
            <div className="cv-notif-dropdown-header">
              <div>
                <strong>Notificações</strong>
                {unreadCount > 0 && <small>{unreadCount} não lida(s)</small>}
              </div>
              {unreadCount > 0 && (
                <button className="cv-mark-read-btn" onClick={markAllAsRead}>
                  Marcar lidas
                </button>
              )}
            </div>

            <div className="cv-notif-dropdown-list">
              {notifications.length === 0 ? (
                <div className="cv-notif-empty">
                  <span>✦</span>
                  <p>Sem notificações no momento.</p>
                  <small>Novos alertas aparecerão aqui em tempo real.</small>
                </div>
              ) : (
                notifications.map((notif) => {
                  const isUnread = !notif.read && !notif.lida;
                  return (
                    <div
                      key={notif.id}
                      className={`cv-notif-item ${isUnread ? "unread" : ""}`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <div className="cv-notif-item-icon">
                        {isUnread ? "✦" : "✓"}
                      </div>
                      <div className="cv-notif-item-body">
                        <div className="cv-notif-item-top">
                          <strong>{getTitle(notif)}</strong>
                          <small>
                            {notif.created_at
                              ? new Date(notif.created_at).toLocaleTimeString("pt-PT", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Recente"}
                          </small>
                        </div>
                        <p>{getMessage(notif)}</p>
                      </div>
                      {isUnread && <span className="cv-notif-dot"></span>}
                    </div>
                  );
                })
              )}
            </div>

            <div className="cv-notif-dropdown-footer">
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  if (onNavigate) onNavigate("Notificações");
                }}
              >
                Ver todas as notificações →
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
