const sgMail = require('@sendgrid/mail');

const sendEmailWithSendGrid = async (to, subject, text) => {
  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    const msg = {
      to,
      from: process.env.EMAIL_USER, // საჭიროა ვერიფიცირებული მისამართი SendGrid-ში
      subject,
      text,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px;">
              <h2>ელ-ფოსტის ვერიფიკაცია</h2>
              <p>გთხოვთ, დააჭირეთ ქვემოთ მოცემულ ბმულს თქვენი ელ-ფოსტის დასადასტურებლად:</p>
              <p><a href="${text.split('clicking this link: ')[1]}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">ელ-ფოსტის დადასტურება</a></p>
            </div>`,
    };
    
    await sgMail.send(msg);
    console.log('📧 Email sent with SendGrid to:', to);
    return true;
  } catch (err) {
    console.error('❌ SendGrid email sending failed:', err);
    if (err.response) {
      console.error(err.response.body);
    }
    return false;
  }
};

module.exports = sendEmailWithSendGrid;