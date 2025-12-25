import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

# Configuration
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "tanvir.chowdhury.us@gmail.com"
SENDER_PASSWORD = "guqdfknoqtuhmzif"

def send_verification_email(to_email: str, code: str):
    """
    Sends a verification code to the specified email address.
    """
    try:
        message = MIMEMultipart()
        message["From"] = SENDER_EMAIL
        message["To"] = to_email
        message["Subject"] = "NSU CSMS Verification Code"

        body = f"""
        <html>
            <body>
                <h2>Verification Code</h2>
                <p>Your verification code for NSU Class Schedule Management System is:</p>
                <h1 style="color: #4f46e5; letter-spacing: 5px;">{code}</h1>
                <p>This code will expire in 10 minutes.</p>
                <p>If you did not request this code, please ignore this email.</p>
            </body>
        </html>
        """
        
        message.attach(MIMEText(body, "html"))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        text = message.as_string()
        server.sendmail(SENDER_EMAIL, to_email, text)
        server.quit()
        
        logging.info(f"Verification email sent to {to_email}")
        return True
    except Exception as e:
        logging.error(f"Failed to send email: {e}")
        print(f"Failed to send email: {e}")
        return False
