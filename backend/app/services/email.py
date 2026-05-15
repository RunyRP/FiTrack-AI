import os
import requests
from requests.auth import HTTPBasicAuth

def get_email_template(title: str, content: str, button_text: str = None, button_url: str = None):
    """
    Returns a styled HTML template matching the FitTrack AI aesthetic with inline styles for maximum compatibility.
    """
    primary_color = "#fbc531"  # Bold Gym Yellow
    bg_color = "#000000"       # Dark Background
    card_bg = "#121212"        # Dark Card Background
    text_color = "#ffffff"
    muted_text = "#888888"
    accent_text = "#cccccc"

    button_html = ""
    if button_text and button_url:
        button_html = f"""
            <div style="margin-top: 30px; text-align: center;">
                <a href="{button_url}" style="background-color: {primary_color}; color: #000000; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 800; font-size: 16px; display: inline-block; text-transform: uppercase; letter-spacing: 1px;">
                    {button_text}
                </a>
            </div>
        """

    # Wrap content paragraphs in styled p tags if they aren't already
    if "<p" not in content:
        content = f'<p style="font-size: 16px; color: {accent_text}; line-height: 1.6;">{content}</p>'
    else:
        # Inject styles into existing p and h3 tags
        content = content.replace("<p>", f'<p style="font-size: 16px; color: {accent_text}; line-height: 1.6;">')
        content = content.replace("<h3>", f'<h3 style="color: {text_color}; font-size: 20px; font-weight: 700;">')

    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{title}</title>
    </head>
    <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: {bg_color}; color: {text_color}; margin: 0; padding: 0;">
        <div style="background-color: {bg_color}; padding: 40px 10px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: {card_bg}; border: 1px solid #222222; border-radius: 16px; overflow: hidden;">
                <div style="padding: 40px 20px; text-align: center; border-bottom: 1px solid #222222;">
                    <div style="font-size: 24px; font-weight: 900; letter-spacing: -1px; color: {text_color}; text-transform: uppercase;">
                        FIT<span style="color: {primary_color};">TRACK</span> AI
                    </div>
                </div>
                <div style="padding: 40px; line-height: 1.6;">
                    <h1 style="margin-top: 0; font-size: 28px; font-weight: 800; text-align: center; color: {text_color};">
                        {title}
                    </h1>
                    {content}
                    {button_html}
                </div>
                <div style="padding: 20px; text-align: center; color: {muted_text}; font-size: 12px; border-top: 1px solid #222222;">
                    &copy; 2026 FitTrack AI. All rights reserved.<br/>
                    Elevating your performance through intelligence.
                </div>
            </div>
        </div>
    </body>
    </html>
    """

def send_mailjet_email(to_email: str, subject: str, text_content: str, html_content: str):
    api_key = os.getenv("MAILJET_API_KEY")
    api_secret = os.getenv("MAILJET_SECRET_KEY")
    sender_email = os.getenv("MAILJET_SENDER_EMAIL", "ronniepavoni@gmail.com")

    if not api_key or not api_secret:
        return False

    url = "https://api.mailjet.com/v3.1/send"
    data = {
        'Messages': [
            {
                "From": {
                    "Email": sender_email,
                    "Name": "FitTrack AI"
                },
                "To": [
                    {
                        "Email": to_email,
                        "Name": "Athlete"
                    }
                ],
                "Subject": subject,
                "TextPart": text_content,
                "HTMLPart": html_content
            }
        ]
    }

    try:
        response = requests.post(
            url,
            auth=HTTPBasicAuth(api_key, api_secret),
            json=data
        )
        return response.status_code == 200
    except Exception:
        return False

def send_verification_email(email: str, token: str):
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    verify_url = f"{frontend_url}/verify-email?token={token}"
    
    title = "Verify Your Account"
    content = "<p>Welcome to the elite circle of FitTrack AI. To start tracking your progress and unlocking AI-powered insights, please confirm your email address.</p>"
    
    html_content = get_email_template(
        title=title,
        content=content,
        button_text="Verify Email Address",
        button_url=verify_url
    )
    
    text_content = f"Welcome to FitTrack AI! Confirm your account here: {verify_url}"
    return send_mailjet_email(email, "Confirm your FitTrack AI account", text_content, html_content)

def send_welcome_email(email: str):
    title = "Verification Successful"
    content = "<h3>You're All Set!</h3><p>Your account is now fully active. You've taken the first step towards a smarter, data-driven fitness journey.</p><p>Log in now to set up your profile and get your first AI-generated workout plan.</p>"
    
    html_content = get_email_template(
        title=title,
        content=content,
        button_text="Access Dashboard",
        button_url=os.getenv("FRONTEND_URL", "http://localhost:5173")
    )
    
    text_content = "Welcome to FitTrack AI! Your account is verified. Start training today."
    return send_mailjet_email(email, "Welcome to FitTrack AI!", text_content, html_content)
