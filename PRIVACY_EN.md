# Privacy Policy

**YouTube Comments with Gemini**

Last updated: January 2025

## Introduction

"YouTube Comments with Gemini" (hereinafter "the Extension") respects user privacy and is committed to protecting personal information. This Privacy Policy explains what information the Extension collects and how it is used.

## Information We Collect

### 1. Google Account Information

The Extension uses Google OAuth for authentication. The following information is obtained during authentication:

- **Google User ID**: Used for account identification
- **Email address**: Used for account management
- **Display name**: Used for UI display
- **Profile image URL**: Used for UI display

### 2. YouTube Video Data

The following data is retrieved through the YouTube Data API v3 during analysis:

- **Video ID and title**: Used to identify the analysis target
- **Comment data**: Text content, author name, like count, post date, reply information
- **Total comment count**: Used for display and analysis

### 3. Usage Data

- **Credit balance**: Used for service usage management
- **Analysis history**: Stored locally in the user's browser (localStorage), up to 20 entries
- **Settings**: Customization preferences such as theme, font size, and language

### 4. Automatically Collected Information

- **Analysis request logs**: API usage is logged on the server side for cost management purposes

## How We Use Information

Collected information is used solely for the following purposes:

1. **Providing the comment analysis service**: AI analysis of YouTube video comments (sentiment analysis, summaries, topic extraction)
2. **User authentication**: Login and session management via Google Account
3. **Credit management**: Managing credit balances and billing for analyses
4. **Service improvement**: Maintaining service quality through API cost management and error monitoring

## Where Information Is Stored

| Data | Storage Location | Retention Period |
|------|-----------------|-----------------|
| User account information | Server memory (in-memory) | While server is running only |
| Session token | Browser (chrome.storage) | Until logout |
| Analysis history | Browser (localStorage) | Until user deletes (max 20 entries) |
| Design settings | Browser (localStorage) | Until user deletes |
| Language settings | Browser (localStorage) | Until user changes |
| API cost logs | Server memory | While server is running only |

## Data Sharing with Third Parties

The Extension uses the following Google API services:

- **Google OAuth 2.0**: User authentication
- **YouTube Data API v3**: Fetching comment data
- **Google Gemini API**: AI analysis of comments

Data sent to these services is limited to what is necessary for providing the Extension's functionality. We do not sell, trade, or otherwise provide users' personal information to any third parties beyond those listed above.

### Use of Google API Services

The Extension's use and transfer of information received from Google API services adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy).

## Data Security

- Authentication uses JWT (JSON Web Tokens) to securely manage session information
- HTTPS is recommended for server communication
- API keys are managed server-side and are not exposed to the client
- Only the minimum necessary user data is collected, and unnecessary data is not retained

## User Rights

Users have the following rights:

1. **View data**: You can view stored analysis history and settings from the settings page
2. **Delete data**: Analysis history and settings can be deleted from the browser
3. **Disconnect account**: Google Account integration can be revoked at any time
4. **Remove the Extension**: Uninstalling the Chrome extension will delete all data stored in the browser

## Use of Cookies

The Extension does not use cookies. Session management uses JWT tokens and the chrome.storage API.

## Children's Privacy

The Extension is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.

## Changes to This Privacy Policy

This Privacy Policy may be updated without prior notice. Any changes will be communicated by updating this page.

## Contact Us

If you have any questions or comments about this Privacy Policy, please contact us through the following channels:

- **Contact form**: [Bug Reports & Inquiries](https://docs.google.com/forms/d/e/1FAIpQLSeUlF5s7vgcG0RrISNrAwLKhMQTvJpndH8e31Z_WHF081McEA/viewform)
- **Developer website**: [keigoly.jp](https://keigoly.jp/)
- **GitHub**: [keigoly](https://github.com/keigoly)
