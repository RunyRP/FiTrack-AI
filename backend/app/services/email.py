def send_welcome_email(email: str):
    """
    Mock email service. 
    In a real app, you would use SMTP or an API (SendGrid, Mailgun, etc.)
    """
    print(f"\n" + "="*50)
    print(f"📧  MOCK EMAIL SENT TO: {email}")
    print(f"Subject: Welcome to FitTrack AI!")
    print(f"Body: Hello! Your account has been successfully created.")
    print("="*50 + "\n")
