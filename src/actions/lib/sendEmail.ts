interface MailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

const sendEmail = async (options: MailOptions) => {
  
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY!
    },
    body: JSON.stringify({
      sender: {
        name: process.env.BREVO_SENDER_NAME!,
        email: process.env.BREVO_SENDER_EMAIL!
      },
      to: [
        {
          email: options.to
        }
      ],
      subject: options.subject,
      htmlContent: options.html,
      textContent: options.text
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Erreur envoi email: ${error.message || response.statusText}`);
  }

  return await response.json();
};

export default sendEmail;