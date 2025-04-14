const nodemailer = require('nodemailer');
const sendEmailWithSendGrid = require('./sendEmailWithSendGrid');

const sendEmail = async (to, subject, text) => {
  try {
    // Extract verification link if it exists in the text
    let verificationLink = '';
    if (text.includes('clicking this link:')) {
      verificationLink = text.split('clicking this link: ')[1];
    } else {
      verificationLink = text; // Assume the entire text is a link if no prefix
    }
    
    console.log('📧 Attempting to send email via Nodemailer to:', to);
    
    // Use Gmail service directly instead of custom SMTP settings
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Should be an App Password
      }
    });

    const mailOptions = {
      from: `"Auth Service" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
              <h2>Email Verification</h2>
              <p>Please click the button below to verify your email:</p>
              <p><a href="${verificationLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Verify Email</a></p>
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p>${verificationLink}</p>
              <p>Thank you!</p>
            </div>`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Email sent successfully via Nodemailer:', info.messageId);
    return true;
  } catch (err) {
    console.error('❌ Nodemailer email sending failed:', {
      message: err.message,
      code: err.code,
      command: err.command || 'N/A'
    });
    
    // If Nodemailer fails and we have SendGrid API Key, try SendGrid
    if (process.env.SENDGRID_API_KEY) {
      console.log('📧 Attempting to send email via SendGrid as fallback...');
      return await sendEmailWithSendGrid(to, subject, text);
    }
    
    return false;
  }
};

module.exports = sendEmail;