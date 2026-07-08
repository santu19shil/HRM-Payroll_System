const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'HR Payroll System <noreply@hrpayroll.com>',
      to,
      subject,
      html
    });
    console.log(`Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send failed:', error.message);
    // Don't throw - email failure shouldn't break the flow
    return { success: false, error: error.message };
  }
};

const sendWelcomeEmail = async ({ email, employeeId, tempPassword, name }) => {
  const subject = 'Welcome to Enterprise HRMS - Your Account Details';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
      <div style="background: #2563eb; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Enterprise HRMS</h1>
      </div>
      <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #1e293b; margin-top: 0;">Welcome, ${name}!</h2>
        <p style="color: #475569; line-height: 1.6;">Your employee account has been created successfully. Please use the following credentials to login:</p>
        
        <div style="background: #f1f5f9; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong style="color: #2563eb;">Employee ID:</strong> <span style="color: #1e293b;">${employeeId}</span></p>
          <p style="margin: 5px 0;"><strong style="color: #2563eb;">Temporary Password:</strong> <span style="color: #dc2626; font-weight: bold;">${tempPassword}</span></p>
          <p style="margin: 5px 0;"><strong style="color: #2563eb;">Login URL:</strong> <a href="http://localhost:5173" style="color: #2563eb;">http://localhost:5173</a></p>
        </div>
        
        <div style="background: #fef2f2; padding: 15px; border-radius: 6px; border-left: 4px solid #dc2626;">
          <p style="color: #991b1b; margin: 0; font-size: 14px;">
            <strong>⚠ Important:</strong> You are required to change your password on first login. 
            The temporary password will expire after first successful login.
          </p>
        </div>
        
        <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
          For security reasons, please do not share your credentials with anyone.
          If you did not request this account, please contact HR immediately.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
          This is an automated message from Enterprise HRMS. Please do not reply to this email.
        </p>
      </div>
    </div>
  `;
  return sendEmail({ to: email, subject, html });
};

const sendPasswordChangedEmail = async ({ email, name }) => {
  const subject = 'Password Changed Successfully';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
      <div style="background: #16a34a; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Password Updated</h1>
      </div>
      <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #1e293b; margin-top: 0;">Hi ${name},</h2>
        <p style="color: #475569; line-height: 1.6;">Your password has been changed successfully.</p>
        <p style="color: #475569; line-height: 1.6;">If you did not make this change, please contact HR immediately.</p>
      </div>
    </div>
  `;
  return sendEmail({ to: email, subject, html });
};

module.exports = { sendEmail, sendWelcomeEmail, sendPasswordChangedEmail };