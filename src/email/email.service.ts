import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { EmailConfigurationException, EmailSendingException } from './exceptions/email.exceptions';
import { CustomLogger } from 'src/common/logger/custom.logger';

export interface EmailOptions 
{
    to: string;
    subject: string;
    text: string;
    html?: string;
}

@Injectable()
export class EmailService 
{
    private transporter: Transporter | null = null;
    
    // Store validated configuration values
    private readonly emailFrom: string;
    private readonly frontendUrl: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly logger: CustomLogger,
    ) 
    {
        this.initializeTransporter();
        
        // Validate and store FRONTEND_URL
        const frontendUrl = this.configService.get<string>('FRONTEND_URL');
        if (!frontendUrl) 
        {
            throw new EmailConfigurationException('FRONTEND_URL');
        }
        this.frontendUrl = frontendUrl;
        
        // Store EMAIL_FROM (already validated in initializeTransporter)
        this.emailFrom = this.configService.get<string>('EMAIL_FROM')!;
    }

    private initializeTransporter(): void 
    {
        const smtpHost = this.configService.get<string>('SMTP_HOST');
        const smtpPort = this.configService.get<number>('SMTP_PORT');
        const smtpUser = this.configService.get<string>('SMTP_USER');
        const smtpPass = this.configService.get<string>('SMTP_PASS');
        const emailFrom = this.configService.get<string>('EMAIL_FROM');

        // Validate required configuration
        if (!smtpHost) 
        {
            throw new EmailConfigurationException('SMTP_HOST');
        }
        if (!smtpPort) 
        {
            throw new EmailConfigurationException('SMTP_PORT');
        }
        if (!smtpUser) 
        {
            throw new EmailConfigurationException('SMTP_USER');
        }
        if (!smtpPass) 
        {
            throw new EmailConfigurationException('SMTP_PASS');
        }
        if (!emailFrom) 
        {
            throw new EmailConfigurationException('EMAIL_FROM');
        }

        this.transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: false, // Use TLS
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
        });

        this.logger.debug('Email transporter initialized successfully', 'EmailService#initializeTransporter');
    }

    async sendEmail(options: EmailOptions): Promise<void> 
    {
        // transporter is guaranteed to exist due to constructor validation
        try 
        {
            const info = await this.transporter!.sendMail({
                from: this.emailFrom,
                to: options.to,
                subject: options.subject,
                text: options.text,
                html: options.html,
            });

            this.logger.debug(`Email sent successfully to ${options.to}. Message ID: ${info.messageId}`, 'EmailService#sendEmail');
            
            // For development with Ethereal, log preview URL
            if (nodemailer.getTestMessageUrl(info)) 
            {
                this.logger.debug(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`, 'EmailService#sendEmail');
            }
        } 
        catch (error) 
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to send email to ${options.to}: ${errorMessage}`, error instanceof Error ? error.stack : undefined, 'EmailService#sendEmail');
            throw new EmailSendingException(errorMessage);
        }
    }

    generateVerificationEmail(email: string, token: string): EmailOptions 
    {
        const verificationUrl = `${this.frontendUrl}/auth/verify-email?token=${token}`;

        return {
            to: email,
            subject: 'Verify your Barback account',
            text: `Please verify your email address by clicking the following link: ${verificationUrl}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Welcome to Barback!</h2>
                    <p>Thank you for creating an account. Please verify your email address by clicking the button below:</p>
                    <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">
                        Verify Email Address
                    </a>
                    <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                    <p><a href="${verificationUrl}">${verificationUrl}</a></p>
                    <p>This verification link will expire in 24 hours.</p>
                    <p>If you didn't create a Barback account, you can safely ignore this email.</p>
                </div>
            `,
        };
    }

    generatePasswordResetEmail(email: string, token: string): EmailOptions 
    {
        const resetUrl = `${this.frontendUrl}/auth/reset-password?token=${token}`;

        return {
            to: email,
            subject: 'Reset your Barback password',
            text: `You requested a password reset. Click the following link to reset your password: ${resetUrl}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Password Reset Request</h2>
                    <p>You requested to reset your password for your Barback account. Click the button below to set a new password:</p>
                    <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">
                        Reset Password
                    </a>
                    <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                    <p><a href="${resetUrl}">${resetUrl}</a></p>
                    <p>This reset link will expire in 1 hour.</p>
                    <p>If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
                </div>
            `,
        };
    }

    generateOrganizationInvitationEmail(
        email: string,
        _invitationId: string, // no longer embedded; retained for interface compatibility
        organizationName: string,
        role: string,
    ): EmailOptions 
    {
        const invitationsPageUrl = `${this.frontendUrl}/invitations`;
        const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
        return {
            to: email,
            subject: `You're invited to join ${organizationName} on Barback`,
            text: `You've been invited to join ${organizationName} as a ${roleDisplay}. Log in to view and act on your invitations: ${invitationsPageUrl}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>You're invited to join ${organizationName}!</h2>
                    <p>You've been invited to join <strong>${organizationName}</strong> as a <strong>${roleDisplay}</strong> on Barback.</p>
                    <p>To accept or decline this invitation, log into your Barback account. If you don't have an account yet, register with the same email address to see the invitation.</p>
                    <div style="margin: 24px 0;">
                        <a href="${invitationsPageUrl}" style="display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 4px;">
                            View Invitations
                        </a>
                    </div>
                    <p style="font-size: 14px; color: #666;">
                        This invitation will expire in 7 days. If you didn't expect this invitation, you can ignore this email.
                    </p>
                </div>
            `,
        };
    }
}
