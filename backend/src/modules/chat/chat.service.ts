import { In } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { ChatThread } from '../../entities/chat-thread.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import { Product } from '../../entities/product.entity';
import { User } from '../../entities/user.entity';
import { PrivacyAuditLog } from '../../entities/privacy-audit-log.entity';
import {
  ChatMessageType,
  ChatThreadStatus,
  DealStatus,
  NotificationType,
  ProductStatus,
} from '../../types/enums';
import { decrypt, decryptNumber } from '../../utils/encryption';
import { AppError } from '../../middleware/error-handler';
import { notificationService } from '../../services/notification.service';
import { emitChatMessage, emitDealUpdate } from '../../services/socket.service';
import { trustService } from '../../services/trust.service';
import { auditService } from '../../services/audit.service';
import { AuditAction } from '../../types/enums';
import { SendMessageInput, UpdateDealStatusInput } from './chat.schemas';

const DEAL_LABELS: Record<DealStatus, string> = {
  [DealStatus.INTERESTED]: 'Interesado',
  [DealStatus.AGREED]: 'Acordado',
  [DealStatus.PICKED_UP]: 'Recogido',
  [DealStatus.CLOSED]: 'Cerrado',
};

export class ChatService {
  private threadRepo = AppDataSource.getRepository(ChatThread);
  private messageRepo = AppDataSource.getRepository(ChatMessage);
  private productRepo = AppDataSource.getRepository(Product);
  private auditRepo = AppDataSource.getRepository(PrivacyAuditLog);

  private threadDto(thread: ChatThread, userId: string) {
    const isOwner = thread.ownerId === userId;
    return {
      id: thread.id,
      productId: thread.productId,
      productTitle: thread.product?.title,
      ownerId: thread.ownerId,
      tenantId: thread.tenantId,
      otherName: isOwner ? thread.tenant?.displayName : thread.owner?.displayName,
      otherUserId: isOwner ? thread.tenantId : thread.ownerId,
      isOwner,
      status: thread.status,
      dealStatus: thread.dealStatus,
      agreedPrice: thread.agreedPrice,
      ownerAcceptedContact: thread.ownerAcceptedContact,
      locationSharedAt: thread.locationSharedAt,
      closedAt: thread.closedAt,
    };
  }

  async listThreads(userId: string) {
    const threads = await this.threadRepo.find({
      where: [{ ownerId: userId }, { tenantId: userId }],
      relations: { product: true, owner: true, tenant: true },
      order: { updatedAt: 'DESC' },
    });

    const threadIds = threads.map((t) => t.id);
    const lastByThread = new Map<string, ChatMessage>();
    if (threadIds.length > 0) {
      const all = await this.messageRepo.find({
        where: { threadId: In(threadIds) },
        order: { createdAt: 'DESC' },
      });
      for (const m of all) {
        if (!lastByThread.has(m.threadId)) lastByThread.set(m.threadId, m);
      }
    }

    return threads.map((t) => {
      const base = this.threadDto(t, userId);
      const last = lastByThread.get(t.id);
      return {
        ...base,
        lastMessage: last?.type === ChatMessageType.SYSTEM
          ? last.content
          : last?.content?.slice(0, 80) ?? 'Sin mensajes',
        lastAt: last?.createdAt ?? t.createdAt,
      };
    });
  }

  async getThread(userId: string, threadId: string) {
    const thread = await this.threadRepo.findOne({
      where: { id: threadId },
      relations: { product: true, owner: true, tenant: true },
    });
    if (!thread) throw new AppError(404, 'Thread not found', 'NOT_FOUND');
    if (thread.tenantId !== userId && thread.ownerId !== userId) {
      throw new AppError(403, 'Forbidden', 'FORBIDDEN');
    }
    return this.threadDto(thread, userId);
  }

  async listRepeatClients(ownerId: string) {
    const threads = await this.threadRepo.find({
      where: { ownerId, dealStatus: DealStatus.CLOSED },
      relations: { product: true, tenant: true },
      order: { closedAt: 'DESC' },
    });

    const byTenant = new Map<
      string,
      {
        tenantId: string;
        displayName: string;
        productId: string;
        productTitle: string;
        lastClosedAt: Date;
        threadId: string;
      }
    >();

    for (const t of threads) {
      if (!byTenant.has(t.tenantId)) {
        byTenant.set(t.tenantId, {
          tenantId: t.tenantId,
          displayName: t.tenant.displayName,
          productId: t.productId,
          productTitle: t.product?.title ?? '',
          lastClosedAt: t.closedAt ?? t.updatedAt,
          threadId: t.id,
        });
      }
    }

    return Array.from(byTenant.values());
  }

  async repeatContact(ownerId: string, tenantId: string, productId: string) {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product || product.ownerId !== ownerId) {
      throw new AppError(404, 'Product not found', 'NOT_FOUND');
    }

    let thread = await this.threadRepo.findOne({
      where: { productId, tenantId, ownerId },
    });

    if (!thread) {
      thread = this.threadRepo.create({
        productId,
        ownerId,
        tenantId,
        status: ChatThreadStatus.OPEN,
        dealStatus: DealStatus.INTERESTED,
        ownerAcceptedContact: false,
        tenantQuestionnaireCompleted: true,
      });
      await this.threadRepo.save(thread);
    } else if (thread.dealStatus === DealStatus.CLOSED) {
      thread.dealStatus = DealStatus.INTERESTED;
      thread.status = ChatThreadStatus.OPEN;
      thread.ownerAcceptedContact = false;
      thread.locationSharedAt = undefined;
      thread.closedAt = undefined;
      thread.agreedPrice = undefined;
      await this.threadRepo.save(thread);
    }

    const owner = await AppDataSource.getRepository(User).findOne({
      where: { id: ownerId },
    });
    const msg = await this.addSystemMessage(
      thread.id,
      ownerId,
      `${owner?.displayName ?? 'El dueño'} te contacta de nuevo por "${product.title}"`,
    );

    await notificationService.notify(tenantId, {
      type: NotificationType.NEW_MESSAGE,
      title: 'Cliente recurrente',
      body: `${owner?.displayName ?? 'El dueño'} quiere alquilarte de nuevo`,
      linkType: 'chat',
      linkId: thread.id,
    });

    return { thread: this.threadDto(thread, ownerId), message: msg };
  }

  async createThread(tenantId: string, productId: string) {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: { owner: true },
    });
    if (!product) throw new AppError(404, 'Product not found', 'NOT_FOUND');
    if (product.status !== ProductStatus.ACTIVE) {
      throw new AppError(400, 'Producto no disponible', 'NOT_AVAILABLE');
    }
    if (product.ownerId === tenantId) {
      throw new AppError(400, 'Cannot chat with your own product', 'INVALID');
    }

    await trustService.assertCanOpenChat(tenantId);
    await trustService.assertNotBlocked(tenantId, product.ownerId);

    const tenant = await AppDataSource.getRepository(User).findOne({
      where: { id: tenantId },
    });

    let thread = await this.threadRepo.findOne({
      where: { productId, tenantId },
    });
    const isNew = !thread;
    if (!thread) {
      thread = this.threadRepo.create({
        productId,
        ownerId: product.ownerId,
        tenantId,
        status: ChatThreadStatus.OPEN,
        dealStatus: DealStatus.INTERESTED,
      });
      await this.threadRepo.save(thread);
    }

    if (isNew) {
      await notificationService.notify(product.ownerId, {
        type: NotificationType.NEW_CHAT,
        title: '¡Nuevo interés!',
        body: `${tenant?.displayName ?? 'Alguien'} quiere tu "${product.title}"`,
        linkType: 'chat',
        linkId: thread.id,
      });
    }

    const full = await this.threadRepo.findOne({
      where: { id: thread.id },
      relations: { product: true, owner: true, tenant: true },
    });

    return {
      thread: this.threadDto(full!, tenantId),
      productTitle: product.title,
      isNew,
    };
  }

  /** Dueño: 1 tap — acordado + compartir ubicación */
  async ownerConfirmDeal(ownerId: string, threadId: string, agreedPrice?: number) {
    const thread = await this.loadThread(threadId, ownerId, true);
    thread.dealStatus = DealStatus.AGREED;
    thread.ownerAcceptedContact = true;
    thread.locationSharedAt = new Date();
    if (agreedPrice !== undefined) {
      thread.agreedPrice = agreedPrice.toFixed(2);
    }
    await this.threadRepo.save(thread);
    await this.syncProductStatus(thread.productId, DealStatus.AGREED);

    await this.addSystemMessage(
      threadId,
      ownerId,
      `Trato acordado${thread.agreedPrice ? ` — S/ ${thread.agreedPrice}` : ''}. Ubicación compartida.`,
    );

    await notificationService.notify(thread.tenantId, {
      type: NotificationType.DEAL_AGREED,
      title: '¡Trato acordado!',
      body: `Puedes ver la ubicación y pasar a recoger "${thread.product.title}"`,
      linkType: 'chat',
      linkId: threadId,
    });

    await notificationService.notify(thread.tenantId, {
      type: NotificationType.LOCATION_SHARED,
      title: 'Ubicación disponible',
      body: `El dueño compartió la dirección para "${thread.product.title}"`,
      linkType: 'chat',
      linkId: threadId,
    });

    this.emitDeal(thread, ownerId);
    return this.threadDto(thread, ownerId);
  }

  async updateDealStatus(
    userId: string,
    threadId: string,
    input: UpdateDealStatusInput,
  ) {
    const thread = await this.loadThread(threadId, userId);
    const isOwner = thread.ownerId === userId;

    const transitions: Partial<Record<DealStatus, DealStatus[]>> = {
      [DealStatus.INTERESTED]: [DealStatus.AGREED],
      [DealStatus.AGREED]: [DealStatus.PICKED_UP],
      [DealStatus.PICKED_UP]: [DealStatus.CLOSED],
    };

    const allowed = transitions[thread.dealStatus] ?? [];
    if (!allowed.includes(input.dealStatus)) {
      throw new AppError(400, 'Transición de estado no válida', 'INVALID_TRANSITION');
    }

    if (input.dealStatus === DealStatus.AGREED && !isOwner) {
      throw new AppError(403, 'Solo el dueño puede confirmar acuerdo', 'FORBIDDEN');
    }
    if (
      (input.dealStatus === DealStatus.PICKED_UP ||
        input.dealStatus === DealStatus.CLOSED) &&
      !isOwner
    ) {
      throw new AppError(403, 'Solo el dueño puede actualizar este estado', 'FORBIDDEN');
    }

    thread.dealStatus = input.dealStatus;
    if (input.agreedPrice !== undefined) {
      thread.agreedPrice = input.agreedPrice.toFixed(2);
    }

    if (input.dealStatus === DealStatus.CLOSED) {
      thread.status = ChatThreadStatus.CLOSED;
      thread.closedAt = new Date();
      await auditService.log(userId, AuditAction.DEAL_CLOSED, 'chat_thread', threadId);
    }

    await this.threadRepo.save(thread);
    await this.syncProductStatus(thread.productId, input.dealStatus);

    const label = DEAL_LABELS[input.dealStatus];
    await this.addSystemMessage(threadId, userId, `Estado: ${label}`);

    const notifMap: Partial<Record<DealStatus, NotificationType>> = {
      [DealStatus.AGREED]: NotificationType.DEAL_AGREED,
      [DealStatus.PICKED_UP]: NotificationType.DEAL_PICKED_UP,
      [DealStatus.CLOSED]: NotificationType.DEAL_CLOSED,
    };
    const recipient = isOwner ? thread.tenantId : thread.ownerId;
    const nType = notifMap[input.dealStatus];
    if (nType) {
      await notificationService.notify(recipient, {
        type: nType,
        title: label,
        body: `"${thread.product.title}" — ${label}`,
        linkType: 'chat',
        linkId: threadId,
      });
    }

    this.emitDeal(thread, userId);
    return this.threadDto(thread, userId);
  }

  async sendMessage(userId: string, threadId: string, input: SendMessageInput) {
    const thread = await this.threadRepo.findOne({
      where: { id: threadId },
      relations: { owner: true, product: true, tenant: true },
    });
    if (!thread || thread.status === ChatThreadStatus.CLOSED) {
      throw new AppError(404, 'Thread not found', 'NOT_FOUND');
    }
    if (thread.dealStatus === DealStatus.CLOSED) {
      throw new AppError(400, 'Trato cerrado', 'DEAL_CLOSED');
    }

    const isTenant = thread.tenantId === userId;
    const isOwner = thread.ownerId === userId;
    if (!isTenant && !isOwner) {
      throw new AppError(403, 'Not a participant', 'FORBIDDEN');
    }

    if (isTenant && thread.owner.requiresQuestionnaire) {
      if (
        !thread.tenantQuestionnaireCompleted &&
        input.type !== ChatMessageType.QUESTIONNAIRE_ANSWER
      ) {
        throw new AppError(
          403,
          'Complete questionnaire before sending free text',
          'QUESTIONNAIRE_REQUIRED',
        );
      }
      if (input.type === ChatMessageType.QUESTIONNAIRE_ANSWER) {
        if (!input.questionnaire) {
          throw new AppError(400, 'Questionnaire data required', 'INVALID');
        }
        thread.tenantQuestionnaireCompleted = true;
        await this.threadRepo.save(thread);
        input.content = JSON.stringify(input.questionnaire);

        await notificationService.notify(thread.ownerId, {
          type: NotificationType.QUESTIONNAIRE_DONE,
          title: 'Listo para responder',
          body: `${thread.tenant.displayName} completó el cuestionario`,
          linkType: 'chat',
          linkId: thread.id,
        });
      }
    }

    const message = this.messageRepo.create({
      threadId,
      senderId: userId,
      content: input.content,
      type: input.type,
    });
    await this.messageRepo.save(message);
    thread.updatedAt = new Date();
    await this.threadRepo.save(thread);

    const recipientId = isOwner ? thread.tenantId : thread.ownerId;
    const senderName = isOwner
      ? thread.owner.displayName
      : thread.tenant.displayName;

    if (input.type === ChatMessageType.TEXT) {
      await notificationService.notify(recipientId, {
        type: NotificationType.NEW_MESSAGE,
        title: 'Nuevo mensaje',
        body: `${senderName}: ${input.content.slice(0, 60)}`,
        linkType: 'chat',
        linkId: thread.id,
      });
    }

    const dto = {
      id: message.id,
      threadId: message.threadId,
      senderId: message.senderId,
      content: message.content,
      type: message.type,
      createdAt: message.createdAt,
    };
    emitChatMessage(threadId, dto);

    return message;
  }

  async getMessages(userId: string, threadId: string) {
    const thread = await this.threadRepo.findOne({ where: { id: threadId } });
    if (!thread) throw new AppError(404, 'Thread not found', 'NOT_FOUND');
    if (thread.tenantId !== userId && thread.ownerId !== userId) {
      throw new AppError(403, 'Forbidden', 'FORBIDDEN');
    }

    return this.messageRepo.find({
      where: { threadId },
      order: { createdAt: 'ASC' },
    });
  }

  async acceptContact(ownerId: string, threadId: string) {
    return this.ownerConfirmDeal(ownerId, threadId);
  }

  async revealLocation(userId: string, threadId: string) {
    const thread = await this.threadRepo.findOne({
      where: { id: threadId },
      relations: { product: true },
    });
    if (!thread) throw new AppError(404, 'Thread not found', 'NOT_FOUND');
    if (thread.tenantId !== userId && thread.ownerId !== userId) {
      throw new AppError(403, 'Forbidden', 'FORBIDDEN');
    }
    if (
      !thread.ownerAcceptedContact &&
      thread.dealStatus === DealStatus.INTERESTED
    ) {
      throw new AppError(403, 'Owner has not accepted contact yet', 'CONTACT_NOT_ACCEPTED');
    }

    const product = thread.product;
    await auditService.log(userId, AuditAction.REVEAL_EXACT_LOCATION, 'product', product.id, {
      threadId,
    });

    return {
      address: decrypt(product.exactAddressEncrypted),
      lat: decryptNumber(product.exactLatEncrypted),
      lng: decryptNumber(product.exactLngEncrypted),
    };
  }

  private async loadThread(threadId: string, userId: string, ownerOnly = false) {
    const thread = await this.threadRepo.findOne({
      where: { id: threadId },
      relations: { product: true, owner: true, tenant: true },
    });
    if (!thread) throw new AppError(404, 'Thread not found', 'NOT_FOUND');
    if (ownerOnly && thread.ownerId !== userId) {
      throw new AppError(403, 'Solo el dueño', 'FORBIDDEN');
    }
    if (!ownerOnly && thread.tenantId !== userId && thread.ownerId !== userId) {
      throw new AppError(403, 'Forbidden', 'FORBIDDEN');
    }
    return thread;
  }

  private async syncProductStatus(productId: string, dealStatus: DealStatus) {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) return;

    if (dealStatus === DealStatus.AGREED || dealStatus === DealStatus.PICKED_UP) {
      product.status = ProductStatus.RENTED;
      product.availableToday = false;
    } else if (dealStatus === DealStatus.CLOSED) {
      product.status = ProductStatus.ACTIVE;
      product.availableToday = true;
    }
    await this.productRepo.save(product);
  }

  private async addSystemMessage(threadId: string, senderId: string, content: string) {
    const message = this.messageRepo.create({
      threadId,
      senderId,
      content,
      type: ChatMessageType.SYSTEM,
    });
    await this.messageRepo.save(message);
    emitChatMessage(threadId, {
      id: message.id,
      threadId,
      senderId,
      content,
      type: message.type,
      createdAt: message.createdAt,
    });
    return message;
  }

  private emitDeal(thread: ChatThread, userId: string) {
    emitDealUpdate(thread.id, this.threadDto(thread, userId));
  }
}
