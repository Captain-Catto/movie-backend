import { NotificationType } from "../entities/notification-template.entity";

export interface NotificationGatewayInterface {
  sendNotificationToUser(
    userId: number,
    notification: {
      id: number;
      title: string;
      message: string;
      type: NotificationType;
      createdAt: Date;
    }
  ): Promise<boolean>;

  broadcastNotification(notification: {
    id: number;
    title: string;
    message: string;
    type: NotificationType;
    createdAt: Date;
  }): Promise<void>;

  sendNotificationToRole(
    role: string,
    notification: {
      id: number;
      title: string;
      message: string;
      type: NotificationType;
      createdAt: Date;
    }
  ): Promise<void>;
}
