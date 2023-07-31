const nodemailer = require("nodemailer");

/**

EmailServices class is responsible for sending emails to users.
It currently supports sending emails through NodeMailer.
*/

class EmailServices {
  /**
   * Sends an email to the provided recipient using NodeMailer
   * @param {Object} options - options for the email
   * @param {String} options.email - recipient email address
   * @param {String} options.subject - subject of the email
   * @param {String} options.message - message body of the email
   */
  static async sendWithNodeMailer(options) {
    const transporter = nodemailer.createTransport({
      // host: process.env.EMAIL_HOST,
      // port: process.env.EMAIL_PORT,
      service: "gmail",
      auth: {
        user: "a.sani@alustudent.com",
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: "Abissa From RBAC System <a.sani@alustudent.com>",
      to: options.email,
      subject: options.subject,
      text: options.message,
    };

    await transporter.sendMail(mailOptions);
  }

  static async sendWithSendGrid(options) {
    // send email with sendgrid
    const transporter = nodemailer.createTransport({
      service: "SendGrid",
      auth: {
        user: process.env.SENDGRID_USERNAME,
        pass: process.env.SENDGRID_PASSWORD,
      },
    });
    const mailOptions = {
      from: "Abissa From RBAC System <a.sani@alustudent.com>",
      to: options.email,
      subject: options.subject,
      html: options.html,
      // eslint-disable-next-line no-undef
      text: htmlToText.fromString(html),
    };

    await transporter.sendMail(mailOptions);
  }
}

module.exports = EmailServices;
