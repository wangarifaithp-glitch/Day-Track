import smtplib
from email.message import EmailMessage

from fastapi import HTTPException, status

from app.core.config import get_settings


def require_email_configuration() -> None:
    settings = get_settings()
    if not settings.smtp_host or not settings.smtp_sender:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email verification is not configured on the server.",
        )


def send_email(recipient: str, subject: str, body: str) -> None:
    require_email_configuration()
    settings = get_settings()
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.smtp_sender
    message["To"] = recipient
    message.set_content(body)

    try:
        if settings.smtp_use_ssl:
            with smtplib.SMTP_SSL(
                settings.smtp_host, settings.smtp_port, timeout=15
            ) as smtp:
                _authenticate(smtp)
                smtp.send_message(message)
        else:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
                smtp.starttls()
                _authenticate(smtp)
                smtp.send_message(message)
    except (OSError, smtplib.SMTPException) as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="We couldn’t send the email right now. Please try again later.",
        ) from error


def _authenticate(smtp: smtplib.SMTP | smtplib.SMTP_SSL) -> None:
    settings = get_settings()
    if settings.smtp_username:
        smtp.login(settings.smtp_username, settings.smtp_password or "")
