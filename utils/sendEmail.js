const nodemailer = require('nodemailer');
const sendEmailWithSendGrid = require('./sendEmailWithSendGrid');

const sendEmail = async (to, subject, text) => {
  try {
    // Log more information for debugging
    console.log('📧 Attempting to send email via Nodemailer to:', to);
    
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: `"Auth Service" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
              <h2>ელ-ფოსტის ვერიფიკაცია</h2>
              <p>გთხოვთ, დააჭირეთ ქვემოთ მოცემულ ბმულს თქვენი ელ-ფოსტის დასადასტურებლად:</p>
              <p><a href="${text.split('clicking this link: ')[1]}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">ელ-ფოსტის დადასტურება</a></p>
              <p>თუ ბმულზე დაჭერა არ მუშაობს, შეგიძლიათ პირდაპირ გახსნათ შემდეგი მისამართი:</p>
              <p>${text.split('clicking this link: ')[1]}</p>
              <p>გმადლობთ!</p>
            </div>`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Email sent successfully:', info.messageId);
    
    return true;
  } catch (err) {
    console.error('❌ Nodemailer email sending failed:', err);
    
    // If Nodemailer fails and we have SendGrid API Key, try SendGrid
    if (process.env.SENDGRID_API_KEY) {
      console.log('📧 Attempting to send email via SendGrid as fallback...');
      return await sendEmailWithSendGrid(to, subject, text);
    }
    
    return false;
  }
};

module.exports = sendEmail;