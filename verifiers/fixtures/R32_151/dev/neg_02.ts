interface NotificationDto {
  recipient: string;
  message: string;
  status: 'pending' | 'sent';
}

export async function dispatch(send: (to: string, body: string) => Promise<void>) {
  const notification: NotificationDto = {
    recipient: 'ops@example.com',
    message: 'Nightly job finished',
    status: 'pending',
  };
  await send(notification.recipient, notification.message);
  notification.status = 'sent';
  return notification;
}
