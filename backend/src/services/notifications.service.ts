import type { NotificationMutationResponse, NotificationsResponse } from "@opensource-compass/shared";
import { getSupabaseServiceClient } from "../lib/supabase.js";

export class NotificationsService {
  private readonly supabase = getSupabaseServiceClient();

  async list(userId: string): Promise<NotificationsResponse> {
    const { data, error } = await this.supabase
      .from("notifications")
      .select("id,type,title,body,action_url,read_at,created_at")
      .eq("user_id", userId)
      .not("type", "ilike", "%recommendation%")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    return {
      notifications: (data ?? []).map((notification) => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        actionUrl: notification.action_url,
        readAt: notification.read_at,
        createdAt: notification.created_at
      }))
    };
  }

  async markRead(userId: string, notificationId: string): Promise<NotificationMutationResponse> {
    const { error } = await this.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("id", notificationId);

    if (error) {
      throw error;
    }

    return { success: true };
  }

  async markAllRead(userId: string): Promise<NotificationMutationResponse> {
    const { error } = await this.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);

    if (error) {
      throw error;
    }

    return { success: true };
  }

  async delete(userId: string, notificationId: string): Promise<NotificationMutationResponse> {
    const { error } = await this.supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId)
      .eq("id", notificationId);

    if (error) {
      throw error;
    }

    return { success: true };
  }
}

export const notificationsService = new NotificationsService();
