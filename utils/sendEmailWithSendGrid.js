const sgMail = require('@sendgrid/mail');

const sendEmailWithSendGrid = async (to, subject, text) => {
  try {
    // Make sure API key is valid
    if (!process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY.includes('your_sendgrid_api_key')) {
      console.error('❌ Invalid SendGrid API key');
      return false;
    }
    
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    // Extract verification link if it exists in the text
    let verificationLink = '';
    if (text.includes('clicking this link:')) {
      verificationLink = text.split('clicking this link: ')[1];
    } else {
      verificationLink = text; // Assume the entire text is a link if no prefix
    }
    
    const msg = {
      to,
      from: process.env.EMAIL_USER, // Must be verified in SendGrid
      subject,
      text,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
              <h2>Email Verification</h2>
              <p>Please click the button below to verify your email:</p>
              <p><a href="${verificationLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Verify Email</a></p>
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p>${verificationLink}</p>
              <p>Thank you!</p>
            </div>`,
    };
    
    await sgMail.send(msg);
    console.log('📧 Email sent successfully with SendGrid to:', to);
    return true;
  } catch (err) {
    console.error('❌ SendGrid email sending failed:', err.message);
    if (err.response) {
      console.error('SendGrid error details:', JSON.stringify(err.response.body));
    }
    return false;
  }
};

module.exports = sendEmailWithSendGrid;