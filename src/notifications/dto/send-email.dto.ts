export class SendEmailDto {
  email: string;
  subject: string;
  message: string;
  userId?: string;
  membershipId?: string;
  templateId?: string;
}
