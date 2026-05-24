import { AppDataSource } from '../config/data-source';
import { Notification } from '../entities/notification.entity';
import { NotificationType } from '../types/enums';
import { getSocketIO } from './socket.service';

interface NotifyInput {
  type: NotificationType;
  title: string;
  body: string;
  linkType?: string;
  linkId?: string;
}

export class NotificationService {
  private repo = AppDataSource.getRepository(Notification);

  async notify(userId: string, input: NotifyInput) {
    const notification = this.repo.create({
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      linkType: input.linkType,
      linkId: input.linkId,
      read: false,
    });
    await this.repo.save(notification);

    const io = getSocketIO();
    io?.to(`user:${userId}`).emit('notification:new', this.toDto(notification));

    return notification;
  }

  async list(userId: string, limit = 30) {
    const items = await this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return items.map((n) => this.toDto(n));
  }

  async unreadCount(userId: string) {
    return this.repo.count({ where: { userId, read: false } });
  }

  async markRead(userId: string, id: string) {
    const n = await this.repo.findOne({ where: { id, userId } });
    if (!n) return null;
    n.read = true;
    await this.repo.save(n);
    return this.toDto(n);
  }

  async markAllRead(userId: string) {
    await this.repo.update({ userId, read: false }, { read: true });
  }

  private toDto(n: Notification) {
    return {
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      linkType: n.linkType,
      linkId: n.linkId,
      read: n.read,
      createdAt: n.createdAt,
    };
  }
}

export const notificationService = new NotificationService();
